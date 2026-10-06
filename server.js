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
});
