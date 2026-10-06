const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const os = require('os');
const pty = require('node-pty');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    path: '/api/terminal-socket'
  });

  io.on('connection', (socket) => {
    // Spawn host shell directly bypassing docker using nsenter
    const cmd = 'nsenter';
    const args = ['-t', '1', '-m', '-u', '-n', '-i', 'bash'];
    
    const ptyProcess = pty.spawn(cmd, args, {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: '/root',
      env: { ...process.env, TERM: 'xterm-256color' }
    });

    ptyProcess.onData((data) => {
      socket.emit('data', data);
    });

    socket.on('data', (data) => {
      ptyProcess.write(data);
    });

    socket.on('resize', (size) => {
      try {
        ptyProcess.resize(size.cols, size.rows);
      } catch (e) {
        // Ignore resize errors
      }
    });

    socket.on('disconnect', () => {
      ptyProcess.kill();
    });
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
  });

  // --- Real-time Metrics Stream ---
  const http = require('http');
  let lastTotalRequests = null;

  function fetchTraefikMetrics() {
    return new Promise((resolve) => {
      http.get('http://traefik-core:8080/metrics', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', () => resolve(null));
    });
  }

  function getCpuUsage() {
    const cpus = os.cpus();
    let user = 0, nice = 0, sys = 0, idle = 0, irq = 0;
    for (let cpu in cpus) {
      user += cpus[cpu].times.user;
      nice += cpus[cpu].times.nice;
      sys += cpus[cpu].times.sys;
      irq += cpus[cpu].times.irq;
      idle += cpus[cpu].times.idle;
    }
    const total = user + nice + sys + idle + irq;
    return { total, idle };
  }

  let lastCpu = getCpuUsage();

  setInterval(async () => {
    const metricsTxt = await fetchTraefikMetrics();
    let rps = 0;
    
    if (metricsTxt) {
      let totalRequests = 0;
      const lines = metricsTxt.split('\n');
      for (const line of lines) {
        if (line.startsWith('traefik_entrypoint_requests_total{')) {
          const parts = line.split(' ');
          if (parts.length === 2) {
            totalRequests += parseInt(parts[1], 10);
          }
        }
      }
      
      if (lastTotalRequests !== null && totalRequests >= lastTotalRequests) {
        rps = (totalRequests - lastTotalRequests) / 2; // calculated over 2s interval
      } else if (lastTotalRequests !== null && totalRequests < lastTotalRequests) {
        lastTotalRequests = totalRequests;
      }
      lastTotalRequests = totalRequests;
    }

    const currentCpu = getCpuUsage();
    const idleDiff = currentCpu.idle - lastCpu.idle;
    const totalDiff = currentCpu.total - lastCpu.total;
    const cpuPercent = totalDiff === 0 ? 0 : 100 - ~~(100 * idleDiff / totalDiff);
    lastCpu = currentCpu;

    const ramPercent = Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100);
    
    io.emit('system_metrics', {
      rps: Math.max(0, Math.round(rps)),
      cpu: cpuPercent,
      ram: ramPercent,
      timestamp: Date.now()
    });
  }, 2000);

});
