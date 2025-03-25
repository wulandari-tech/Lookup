// Import modul yang diperlukan
const express = require('express');
const QRCode = require('qrcode');

// Inisialisasi aplikasi Express
const app = express();

// Tentukan port. Gunakan PORT dari environment variable jika ada, atau 3000
const PORT = process.env.PORT || 3000;

// Middleware untuk parsing JSON (jika Anda butuh POST request nanti)
// app.use(express.json());
// Middleware untuk parsing URL-encoded data (jika Anda butuh form submission nanti)
// app.use(express.urlencoded({ extended: true }));

// Route untuk root ("/") - Menghindari error "Cannot GET /"
app.get('/', (req, res) => {
  res.status(200).send(`
    <h1>QR Code Generator Backend</h1>
    <p>Gunakan endpoint /qr untuk membuat QR code.</p>
    <p>Contoh: <a href="/qr?text=https://example.com">/qr?text=https://example.com</a></p>
    <p>Parameter query yang dibutuhkan: <code>text</code> (URL atau teks yang ingin di-encode)</p>
    <p>Parameter query opsional:</p>
    <ul>
      <li><code>size</code> (Ukuran gambar dalam pixel, contoh: 200. Default: sekitar 128)</li>
      <li><code>margin</code> (Margin putih di sekitar QR code, contoh: 1. Default: 4)</li>
      <li><code>errorCorrectionLevel</code> (Level koreksi error: 'L', 'M', 'Q', 'H'. Default: 'M')</li>
    </ul>
  `);
});

// Route untuk generate QR code ("/qr")
app.get('/qr', async (req, res) => {
  const textToEncode = req.query.text; // Ambil teks dari query parameter 'text'
  const size = req.query.size ? parseInt(req.query.size, 10) : undefined; // Ukuran opsional
  const margin = req.query.margin ? parseInt(req.query.margin, 10) : undefined; // Margin opsional
  const errorCorrectionLevel = req.query.errorCorrectionLevel || 'M'; // Level koreksi error opsional

  // Validasi: Pastikan parameter 'text' ada
  if (!textToEncode) {
    return res.status(400).send('Error: Query parameter "text" is required.');
  }

  // Opsi untuk generator QR code
  const qrOptions = {
    errorCorrectionLevel: errorCorrectionLevel,
    type: 'png', // Output sebagai PNG
    width: size, // Jika size tidak undefined, gunakan nilainya
    margin: margin, // Jika margin tidak undefined, gunakan nilainya
    color: {
      dark: "#000000", // Warna modul QR (hitam)
      light: "#FFFFFF" // Warna latar belakang (putih)
    }
  };

  try {
    // Generate QR code sebagai buffer PNG
    const qrCodeBuffer = await QRCode.toBuffer(textToEncode, qrOptions);

    // Set header content type ke image/png
    res.setHeader('Content-Type', 'image/png');

    // Kirim buffer gambar sebagai response
    res.status(200).send(qrCodeBuffer);

  } catch (err) {
    console.error("Failed to generate QR code:", err);
    res.status(500).send('Error generating QR code.');
  }
});

// Jalankan server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Try accessing: http://localhost:${PORT}/qr?text=Hello%20World!`);
});
