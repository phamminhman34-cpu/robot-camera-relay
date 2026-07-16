// ============================================================
// Robot Camera + Audio Relay Server
// Deploy server nay len Render. No lam nhiem vu trung gian:
//   - /camera : ESP32 gui frame anh len day
//   - /viewer : Dien thoai (Flutter) ket noi vao day de XEM anh
//   - /audio  : CA ESP32 va dien thoai cung ket noi vao day de
//               NOI CHUYEN 2 CHIEU voi nhau (day la cho de gay
//               loi nhat vi phai chuyen tiep dung huong)
// ============================================================
const WebSocket = require("ws");
const http = require("http");

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Robot relay server dang chay.\n");
});

// Tao 3 WebSocket server rieng, gan vao cung 1 HTTP server,
// phan biet nhau bang duong dan (path) khi nang cap ket noi.
const wssCamera = new WebSocket.Server({ noServer: true });
const wssViewer = new WebSocket.Server({ noServer: true });
const wssAudio = new WebSocket.Server({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);

  if (pathname === "/camera") {
    wssCamera.handleUpgrade(req, socket, head, (ws) => {
      wssCamera.emit("connection", ws, req);
    });
  } else if (pathname === "/viewer") {
    wssViewer.handleUpgrade(req, socket, head, (ws) => {
      wssViewer.emit("connection", ws, req);
    });
  } else if (pathname === "/audio") {
    wssAudio.handleUpgrade(req, socket, head, (ws) => {
      wssAudio.emit("connection", ws, req);
    });
  } else {
    socket.destroy();
  }
});

// ------------------------------------------------------------
// CAMERA: ESP32 (1 nguon) --broadcast--> nhieu Viewer (dien thoai)
// ------------------------------------------------------------
let viewers = new Set();

wssCamera.on("connection", (ws) => {
  console.log("[camera] ESP32 da ket noi va bat dau gui anh");

  ws.on("message", (data, isBinary) => {
    // data la 1 frame JPEG tu ESP32 -> gui cho tat ca viewer dang xem
    for (const viewer of viewers) {
      if (viewer.readyState === WebSocket.OPEN) {
        viewer.send(data, { binary: true });
      }
    }
  });

  ws.on("close", () => console.log("[camera] ESP32 mat ket noi camera"));
  ws.on("error", (e) => console.log("[camera] Loi:", e.message));
});

wssViewer.on("connection", (ws) => {
  console.log("[viewer] Co dien thoai vao xem camera");
  viewers.add(ws);

  ws.on("close", () => {
    viewers.delete(ws);
    console.log("[viewer] Dien thoai roi khoi man hinh xem");
  });
  ws.on("error", (e) => console.log("[viewer] Loi:", e.message));
});

// ------------------------------------------------------------
// AUDIO 2 CHIEU
// Ca ESP32 va dien thoai deu ket noi vao CUNG /audio.
// Dung dung pattern da duoc kiem chung trong mau
// "ThatProject Walkie-Talkie" (Server_NodeJS/server.js): moi khi
// 1 client gui du lieu am thanh len, server PHAT LAI cho TAT CA
// cac client KHAC (khong gui lai cho chinh no) — don gian, khong
// can biet ai la "robot" ai la "dien thoai", tranh duoc loi
// gan nham vai tro.
// ------------------------------------------------------------
wssAudio.on("connection", (ws) => {
  console.log("[audio] Co thiet bi moi ket noi kenh audio. Tong so:", wssAudio.clients.size);

  ws.on("message", (data, isBinary) => {
    // Phat du lieu am thanh nhan duoc cho TAT CA client khac
    // (khong gui nguoc lai chinh nguoi vua gui, tranh tieng vong)
    wssAudio.clients.forEach((otherClient) => {
      if (otherClient !== ws && otherClient.readyState === WebSocket.OPEN) {
        otherClient.send(data, { binary: true });
      }
    });
  });

  ws.on("close", () => {
    console.log("[audio] Thiet bi roi khoi kenh audio. Con lai:", wssAudio.clients.size);
  });
  ws.on("error", (e) => console.log("[audio] Loi:", e.message));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Relay server dang chay tren cong ${PORT}`);
});
