const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { Client } = require('ssh2');

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
    let sshConn = new Client();
    let sshStream = null;

    socket.on('login', (credentials) => {
      sshConn.on('ready', () => {
         socket.emit('status', 'Connected');
         sshConn.shell((err, stream) => {
             if (err) { 
                 socket.emit('data', '\r\n*** SSH SHELL ERROR ***\r\n'); 
                 socket.emit('status', 'Disconnected');
                 return; 
             }
             sshStream = stream;
             stream.on('data', (d) => socket.emit('data', d.toString('utf-8')));
             stream.on('close', () => {
                 socket.emit('data', '\r\n*** SSH CONNECTION CLOSED ***\r\n');
                 socket.emit('status', 'Disconnected');
                 sshConn.end();
             });
         });
      }).on('error', (err) => {
         socket.emit('data', '\r\n*** SSH CONNECTION ERROR: ' + err.message + ' ***\r\n');
         socket.emit('status', 'Disconnected');
      }).on('end', () => {
         socket.emit('status', 'Disconnected');
      }).connect({
         host: credentials.host || '172.17.0.1', // Default to docker host IP
         port: credentials.port || 22,
         username: credentials.username,
         password: credentials.password,
      });
    });

    socket.on('data', (data) => {
      if (sshStream) sshStream.write(data);
    });

    socket.on('resize', (size) => {
      if (sshStream) sshStream.setWindow(size.rows, size.cols, 480, 640);
    });

    socket.on('disconnect', () => {
      sshConn.end();
    });
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
