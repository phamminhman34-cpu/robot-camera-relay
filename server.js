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

let viewers = new Set();
let frameCount = 0;

wss.on('connection', (ws, req) => {
  const url = req.url || '';

  if (url.startsWith('/camera')) {
    console.log('[camera] ESP32 da ket noi');
    ws.on('message', (data) => {
      frameCount++;
      if (frameCount % 50 === 0) {
        console.log(`[camera] da nhan ${frameCount} khung hinh, dang phat cho ${viewers.size} nguoi xem`);
      }
      for (const viewer of viewers) {
        if (viewer.readyState === WebSocket.OPEN) {
          viewer.send(data);
        }
      }
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
  } else {
    ws.close();
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('Robot camera relay server dang chay tren port', PORT);
});
