# Huong dan nap firmware cho ESP32-S3-CAM

## Buoc 1: Cai Arduino IDE (neu chua co)

Tai tai **arduino.cc/en/software**, cai ban moi nhat (Arduino IDE 2.x).

## Buoc 2: Them ho tro board ESP32 vao Arduino IDE

1. Mo Arduino IDE
2. Vao **File > Preferences** (Windows/Linux) hoac **Arduino IDE > Settings** (Mac)
3. O o **Additional Boards Manager URLs**, dan link nay vao:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Bam OK
5. Vao **Tools > Board > Boards Manager**, go tim "esp32", cai goi
   **esp32 by Espressif Systems** (ban 2.0.x hoac moi hon)

## Buoc 3: Cai cac thu vien can thiet

Vao **Tools > Manage Libraries**, go tim va cai tung cai sau:

| Ten thu vien | Tac gia |
|---|---|
| PubSubClient | Nick O'Leary |
| WebSockets | Markus Sattler (Links2004) |

Luu y: `esp_camera.h` va `driver/i2s.h` da co san khi ban cai goi board ESP32
o Buoc 2, khong can cai them.

## Buoc 4: Mo file firmware

1. Mo file `robot_camera_firmware.ino` (trong thu muc `robot_camera_firmware/`
   ma minh gui) bang Arduino IDE — **luu y**: ten thu muc phai trung ten file
   `.ino` thi Arduino IDE moi mo duoc, minh da dat dung ten roi nen chi can
   mo thang file `.ino` la duoc.

2. Kiem tra lai 2 cho trong code truoc khi nap:
   - Dong `ssid` / `password`: dung Wi-Fi nha ban chua?
   - Dong `wsHost`: co dung domain Render moi nhat cua ban khong?
     (server.js minh gui o tin nhan truoc — nho deploy no len Render
     TRUOC khi nap firmware nay)

## Buoc 5: Chon dung board va cong (port)

1. Cam ESP32-S3-CAM vao may tinh bang cap USB
2. Vao **Tools > Board > esp32 > ESP32S3 Dev Module**
3. Vao **Tools**, kiem tra cac muc sau (rat quan trong voi ESP32-S3):
   - **USB CDC On Boot**: `Enabled`
   - **Flash Size**: tuy board cua ban (thuong 8MB hoac 16MB, xem tem tren
     chip hoac tai lieu nha san xuat board)
   - **PSRAM**: `OPI PSRAM` (bat buoc phai bat, vi camera can PSRAM de
     luu frame anh, khong bat se bi loi camera init that bai)
4. Vao **Tools > Port**, chon cong COM (Windows) hoac /dev/cu.usb...
   (Mac) tuong ung voi ESP32 vua cam vao. Neu khong thay port nao hien
   ra, thu cap USB khac hoac cai driver CH340/CP2102 tuy chip USB tren
   board cua ban.

## Buoc 6: Nap firmware

1. Bam nut **Upload** (mui ten huong sang phai) tren Arduino IDE
2. Doi qua trinh compile + nap (lan dau co the mat vai phut)
3. Neu Arduino IDE bao "Connecting..." rat lau khong nap duoc: giu nut
   **BOOT** tren board trong luc bam Upload, tha ra khi thay bat dau nap

## Buoc 7: Xem log kiem tra

1. Sau khi nap xong, mo **Tools > Serial Monitor**
2. Chinh baud rate o goc duoi ben phai thanh **115200**
3. Ban se thay lan luot cac dong log:
   ```
   Wi-Fi da ket noi thanh cong!
   Camera da khoi tao thanh cong!
   WebSocket camera: da ket noi
   [audio] da ket noi vao server
   ```
   Neu thay ca 4 dong nay la moi thu da san sang.
4. Mo app Flutter tren dien thoai, bam "Giu de noi" — quay lai Serial
   Monitor, ban se thay dong:
   ```
   [audio] da nhan 20 goi tu phone, size=1024 bytes
   ```
   xuat hien deu dan trong luc ban giu nut noi — neu thay dong nay
   nghia la robot DA nhan duoc am thanh, loi (neu con) nam o phia loa
   phan cung (kiem tra day noi MAX98357A) chu khong con o phia mang nua.

## Neu bi loi khi nap

- **"Failed to connect to ESP32: No serial data received"**: giu nut
  BOOT khi bam Upload nhu Buoc 6 noi tren
- **"Camera init that bai, ma loi 0x..."**: kiem tra lai PSRAM da bat
  `OPI PSRAM` o Buoc 5 chua, va kiem tra day noi camera co bi long
  khong
- **Khong thay Wi-Fi ket noi**: kiem tra dung ten Wi-Fi/mat khau, va
  Wi-Fi phai la mang 2.4GHz (ESP32 khong ho tro 5GHz)
