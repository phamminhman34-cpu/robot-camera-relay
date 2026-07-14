// Server trung gian WebSocket cho video camera robot
// - ESP32 (camera) kết nối vào đường dẫn /camera và gửi ảnh JPEG nhị phân liên tục
// - App điện thoại kết nối vào đường dẫn /viewer để nhận lại đúng ảnh đó
// Deploy: dán nguyên file này vào project Node.js trên Glitch.com, cùng với package.json

const WebSocket = require('ws');
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Robot camera relay server dang chay OK');
});

const wss = new WebSocket.Server({ server });

let viewers = new Set();       // xem camera
let micUpListeners = new Set();   // nghe mic robot (phone)
let micDownListeners = new Set(); // nghe mic phone (robot)
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
      if (frameCount % 50 === 0) {
        console.log(`[camera] da nhan ${frameCount} khung hinh, dang phat cho ${viewers.size} nguoi xem`);
      }
      relayBroadcast(viewers, data);
    });
    ws.on('close', () => console.log('[camera] ESP32 da ngat ket noi'));
    ws.on('error', (err) => console.log('[camera] loi:', err.message));

  } else if (url.startsWith('/viewer')) {
    viewers.add(ws);
    console.log(`[viewer] co nguoi xem moi ket noi, tong: ${viewers.size}`);
    ws.on('close', () => {
      viewers.delete(ws);
      console.log(`[viewer] mot nguoi xem thoat, tong: ${viewers.size}`);
    });
    ws.on('error', (err) => console.log('[viewer] loi:', err.message));

  } else if (url.startsWith('/mic-up')) {
    // Robot gui am thanh mic cua no len day, phat lai cho phone nghe
    console.log('[mic-up] ESP32 (mic) da ket noi');
    let micUpCount = 0;
    ws.on('message', (data) => {
      micUpCount++;
      if (micUpCount % 20 === 0) console.log(`[mic-up] da nhan ${micUpCount} goi tu robot, size=${data.length} bytes, dang phat cho ${micUpListeners.size} nguoi nghe`);
      relayBroadcast(micUpListeners, data);
    });
    ws.on('close', () => console.log('[mic-up] ESP32 (mic) da ngat ket noi'));

  } else if (url.startsWith('/mic-up-listen')) {
    micUpListeners.add(ws);
    console.log(`[mic-up-listen] phone bat dau nghe mic robot, tong: ${micUpListeners.size}`);
    ws.on('close', () => micUpListeners.delete(ws));

  } else if (url.startsWith('/mic-down')) {
    // Phone gui am thanh mic cua no len day, phat lai cho robot phat ra loa
    console.log('[mic-down] Phone (mic) da ket noi');
    let micDownCount = 0;
    ws.on('message', (data, isBinary) => {
      micDownCount++;
      console.log(`[mic-down] NHAN GOI #${micDownCount}, size=${data.length} bytes, isBinary=${isBinary}`);
      relayBroadcast(micDownListeners, data);
    });
    ws.on('close', (code, reason) => console.log(`[mic-down] Phone (mic) da ngat ket noi, code=${code}, reason=${reason}`));
    ws.on('error', (err) => console.log('[mic-down] LOI:', err.message));

  } else if (url.startsWith('/mic-down-listen')) {
    micDownListeners.add(ws);
    console.log(`[mic-down-listen] robot bat dau nghe mic phone, tong: ${micDownListeners.size}`);
    ws.on('close', () => micDownListeners.delete(ws));

  } else {
    ws.close();
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('Robot camera relay server dang chay tren port', PORT);
});
