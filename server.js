// ============================================================
// Robot Camera + Audio Relay Server
// Deploy server nay len Render. No lam nhiem vu trung gian:
//   - /stream : ESP32 gui CA anh camera LAN audio mic robot qua
//               CHUNG 1 ket noi (gop lai de tiet kiem RAM ben ESP32,
//               tranh loi "SSL - Memory allocation failed" do mo qua
//               nhieu ket noi SSL cung luc). Moi goi tin binary co
//               1 byte prefix dau tien de phan biet loai:
//                 0x01 = frame anh JPEG (camera)
//                 0x02 = am thanh PCM16 (mic robot)
//   - /viewer : Dien thoai (Flutter) ket noi vao day de XEM anh
//   - /audio  : Dien thoai (Flutter) ket noi vao day de NOI CHUYEN
//               2 CHIEU voi robot (server tu them/bo prefix khi
//               chuyen tiep qua lai voi /stream, ben Flutter KHONG
//               can doi gi ca)
// ============================================================
const WebSocket = require("ws");
const http = require("http");

const PKT_TYPE_CAMERA = 0x01;
const PKT_TYPE_AUDIO  = 0x02;

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Robot relay server dang chay.\n");
});

// Tao 3 WebSocket server rieng, gan vao cung 1 HTTP server,
// phan biet nhau bang duong dan (path) khi nang cap ket noi.
const wssStream = new WebSocket.Server({ noServer: true }); // ESP32 (camera + audio gop chung)
const wssViewer = new WebSocket.Server({ noServer: true });
const wssAudio = new WebSocket.Server({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);

  if (pathname === "/stream") {
    wssStream.handleUpgrade(req, socket, head, (ws) => {
      wssStream.emit("connection", ws, req);
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
// STREAM: ESP32 (1 nguon duy nhat) gui ca camera va audio qua day.
//   - Frame camera (prefix 0x01) --broadcast--> tat ca Viewer
//   - Frame audio (prefix 0x02)  --broadcast--> tat ca client /audio
//     (giu nguyen huong "phat cho nguoi khac" nhu kenh /audio cu,
//     nhung ESP32 gio khong con nam trong wssAudio.clients nua nen
//     khong can dieu kien loai tru chinh no)
// ------------------------------------------------------------
let viewers = new Set();

let espSocket = null; // tham chieu ket noi ESP32 hien tai, dung de gui audio XUONG robot

wssStream.on("connection", (ws) => {
  console.log("[stream] ESP32 da ket noi (camera + audio chung 1 kenh)");
  espSocket = ws;

  ws.on("message", (data, isBinary) => {
    if (!isBinary || data.length < 1) return;

    const pktType = data[0];
    const payload = data.subarray(1); // bo byte prefix truoc khi forward

    if (pktType === PKT_TYPE_CAMERA) {
      for (const viewer of viewers) {
        if (viewer.readyState === WebSocket.OPEN) {
          viewer.send(payload, { binary: true });
        }
      }
    } else if (pktType === PKT_TYPE_AUDIO) {
      wssAudio.clients.forEach((phoneClient) => {
        if (phoneClient.readyState === WebSocket.OPEN) {
          phoneClient.send(payload, { binary: true });
        }
      });
    }
  });

  ws.on("close", () => {
    console.log("[stream] ESP32 mat ket noi");
    if (espSocket === ws) espSocket = null;
  });
  ws.on("error", (e) => console.log("[stream] Loi:", e.message));
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
// AUDIO: Dien thoai (Flutter) ket noi vao day de noi chuyen voi robot.
// ESP32 KHONG con ket noi truc tiep vao /audio nua (da gop vao /stream),
// nen server dong vai "cau noi":
//   - Dien thoai gui audio len day  -> server them prefix 0x02
//     roi forward XUONG cho ESP32 qua ket noi /stream (espSocket).
//   - Audio tu mic robot (ESP32 gui qua /stream, prefix 0x02) da duoc
//     xu ly o wssStream ben tren, forward LEN cho cac client /audio
//     nay (da bo prefix roi, dien thoai nhan du lieu PCM16 thuan,
//     khong can doi gi ca).
// Neu co nhieu dien thoai cung ket noi /audio, audio cua may nay
// cung duoc phat cho may kia luon (giu dung hanh vi broadcast cu).
// ------------------------------------------------------------
wssAudio.on("connection", (ws) => {
  console.log("[audio] Co dien thoai ket noi kenh audio. Tong so:", wssAudio.clients.size);

  ws.on("message", (data, isBinary) => {
    if (!isBinary) return;

    // Gui xuong robot (them prefix PKT_TYPE_AUDIO vi ESP32 chi chap
    // nhan goi co byte dau = 0x02 tren ket noi /stream)
    if (espSocket && espSocket.readyState === WebSocket.OPEN) {
      const framed = Buffer.concat([Buffer.from([PKT_TYPE_AUDIO]), data]);
      espSocket.send(framed, { binary: true });
    }

    // Neu co nhieu dien thoai cung nghe, phat cho cac may khac
    wssAudio.clients.forEach((otherClient) => {
      if (otherClient !== ws && otherClient.readyState === WebSocket.OPEN) {
        otherClient.send(data, { binary: true });
      }
    });
  });

  ws.on("close", () => {
    console.log("[audio] Dien thoai roi khoi kenh audio. Con lai:", wssAudio.clients.size);
  });
  ws.on("error", (e) => console.log("[audio] Loi:", e.message));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Relay server dang chay tren cong ${PORT}`);
});
