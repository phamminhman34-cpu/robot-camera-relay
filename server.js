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

const wss = new WebSocket.Server({ server, perMessageDeflate: false });

let viewers = new Set();       // xem camera
let audioClients = new Set();  // ca robot va phone dung chung 1 kenh audio
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

  } else if (url.startsWith('/audio')) {
    // MOT endpoint duy nhat cho ca robot va phone - ai gui thi phat lai cho NGUOI KHAC
    // (khong chia /mic-up, /mic-down nua - tranh loi trung route)
    audioClients.add(ws);
    console.log(`[audio] co client moi ket noi, tong: ${audioClients.size}`);
    ws.on('message', (data) => {
      for (const client of audioClients) {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      }
    });
    ws.on('close', () => {
      audioClients.delete(ws);
      console.log(`[audio] client ngat ket noi, tong: ${audioClients.size}`);
    });
    ws.on('error', (err) => console.log('[audio] LOI:', err.message));

  } else {
    ws.close();
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('Robot camera relay server dang chay tren port', PORT);
});
