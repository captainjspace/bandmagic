import blessed from 'blessed';
import net from 'net';
import fs from 'fs';

const SOCKET_PATH = '/tmp/deploy.sock';

// 1. Setup Blessed Display Container
const screen = blessed.screen({ smartCSR: true, title: 'Live Pipeline Logs' });
const logBox = blessed.box({
  top: 'center', left: 'center', width: '80%', height: '80%',
  border: { type: 'line' },
  style: { fg: 'green', bg: 'black', border: { fg: 'blue' } },
  wrap: true, // 🗲 Automated word-wrapping happens right here!
  scrollable: true,
  alwaysScroll: true
});
screen.append(logBox);
screen.render();

// 2. Clean layout environment if file exists from an old run
if (fs.existsSync(SOCKET_PATH)) fs.unlinkSync(SOCKET_PATH);

// 3. Initialize Socket Listener Interceptor
const server = net.createServer((socket) => {
  socket.on('data', (data) => {
    // Strip trailing newlines and append directly to the bounded text layout
    const msg = data.toString().trim();
    logBox.pushLine(`[${new Date().toLocaleTimeString()}] ${msg}`);
    logBox.setScrollPerc(100); // Auto scroll to the newest message
    screen.render();
  });
});

server.listen(SOCKET_PATH, () => {
  logBox.pushLine("SYSTEM: Awaiting streams from zsh...");
  screen.render();
});

// Handle termination safely
screen.key(['escape', 'q', 'C-c'], () => {
  server.close();
  if (fs.existsSync(SOCKET_PATH)) fs.unlinkSync(SOCKET_PATH);
  process.exit(0);
});

