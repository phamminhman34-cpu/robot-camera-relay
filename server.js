const WebSocket = require('ws');
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Robot camera relay server dang chay OK');
});

const wss = new WebSocket.Server({ server });

let viewers = new Set();
let micUpListeners = new Set();
let micDownListeners = new Set();
let frameCount = 0;

function relayBroadcast(listeners, data) {
  for (const ws of listeners) {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  }
}

wss.on('connection', (ws, req) => {
  const url = req.url || '';

  if (url.startsWith('/camera')) {
    console.log('[camera] ESP32 da ket noi');
    ws.on('message', (data) => {
      frameCount++;
      if (frameCount % 50 === 0) console.log(`[camera] ${frameCount} frames, ${viewers.size} viewers`);
      relayBroadcast(viewers, data);
    });
    ws.on('close', () => console.log('[camera] ESP32 ngat ket noi'));

  } else if (url.startsWith('/viewer')) {
    viewers.add(ws);
    console.log(`[viewer] ket noi, tong: ${viewers.size}`);
    ws.on('close', () => { viewers.delete(ws); });

  } else if (url.startsWith('/mic-up-listen')) {   // ← PHẢI ĐỂ TRƯỚC /mic-up
    micUpListeners.add(ws);
    console.log(`[mic-up-listen] phone nghe mic robot, tong: ${micUpListeners.size}`);
    ws.on('close', () => micUpListeners.delete(ws));

  } else if (url.startsWith('/mic-up')) {
    console.log('[mic-up] ESP32 mic ket noi');
    let count = 0;
    ws.on('message', (data) => {
      count++;
      if (count % 50 === 0) console.log(`[mic-up] ${count} goi, ${micUpListeners.size} listeners`);
      relayBroadcast(micUpListeners, data);
    });
    ws.on('close', () => console.log('[mic-up] ESP32 mic ngat'));

  } else if (url.startsWith('/mic-down-listen')) {  // ← PHẢI ĐỂ TRƯỚC /mic-down
    micDownListeners.add(ws);
    console.log(`[mic-down-listen] robot nghe mic phone, tong: ${micDownListeners.size}`);
    ws.on('close', () => micDownListeners.delete(ws));

  } else if (url.startsWith('/mic-down')) {
    console.log('[mic-down] Phone mic ket noi');
    let count = 0;
    ws.on('message', (data) => {
      count++;
      if (count % 20 === 0) console.log(`[mic-down] ${count} goi, ${micDownListeners.size} listeners`);
      relayBroadcast(micDownListeners, data);
    });
    ws.on('close', () => console.log('[mic-down] Phone mic ngat'));

  } else {
    ws.close();
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('Robot camera relay server dang chay tren port', PORT);
});
