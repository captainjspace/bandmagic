import blessed from 'blessed';
import net from 'net';
import { WebSocketServer } from 'ws';
import { PassThrough } from 'stream';

const LOG_SOCKET = '/tmp/deploy.sock';

// 1. Create virtual streams to isolate Blessed from your real stdout/stdin
const virtualIn = new PassThrough();
const virtualOut = new PassThrough();

// 2. Instantiate Blessed bound ONLY to our virtual streams
const screen = blessed.screen({
  smartCSR: true,
  input: virtualIn,
  output: virtualOut,
  terminal: 'xterm-256color'
});

const logBox = blessed.box({
  top: 'center', left: 'center', width: '90%', height: '90%',
  border: { type: 'line' },
  style: { fg: 'green', bg: 'black', border: { fg: 'blue' } },
  wrap: true,
  scrollable: true
});
screen.append(logBox);
screen.render();

// 3. Listen for logs coming out of your Zsh pipeline script
net.createServer((socket) => {
  socket.on('data', (data) => {
    logBox.pushLine(`[${new Date().toLocaleTimeString()}] ${data.toString().trim()}`);
    logBox.setScrollPerc(100);
    screen.render();
  });
}).listen(LOG_SOCKET);

// 4. Stream the virtual TUI state down to a browser page via WebSockets
const wss = new WebSocketServer({ port: 8081 });
wss.on('connection', (ws) => {
  // Feed the initial visual state to the browser
  ws.send(virtualOut.read() || '');

  // Whenever Blessed updates the interface layout, pipe the string data to the browser
  virtualOut.on('data', (chunk) => {
    ws.send(chunk);
  });

  // Relay browser keystrokes back into Blessed (allows scrolling via browser up/down keys)
  ws.on('message', (msg) => {
    virtualIn.write(msg);
  });
});

