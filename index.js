// Import modul yang diperlukan
const express = require('express');
const QRCode = require('qrcode');
const path = require('path'); // Untuk menangani path file

// Inisialisasi aplikasi Express
const app = express();

// Tentukan port
const PORT = process.env.PORT || 3000;

// Route untuk root ("/") - Melayani file index.html
app.get('/', (req, res) => {
  // Mengirim file index.html yang berada di direktori yang sama dengan server.js
  res.sendFile(path.join(__dirname, 'index.html'), (err) => {
    if (err) {
      console.error("Error sending index.html:", err);
      // Kirim pesan error jika file tidak ditemukan atau ada masalah lain
      res.status(err.status || 500).send("Could not load the Pay-Mu interface.");
    }
  });
});

// Route untuk generate QR code pembayaran ("/qr")
app.get('/qr', async (req, res) => {
  // Ambil detail pembayaran dari query parameters
  const amount = req.query.amount;
  const transactionId = req.query.transactionId; // ID unik untuk transaksi
  const description = req.query.description || ''; // Deskripsi opsional
  const currency = req.query.currency || 'IDR'; // Default ke IDR
  const recipient = "pay-mu wanzofc"; // Nama merchant/penerima

  // --- Validasi Input ---
  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'Invalid or missing "amount" query parameter. Must be a positive number.' });
  }
  if (!transactionId) {
    return res.status(400).json({ error: 'Missing "transactionId" query parameter.' });
  }
  // --- Akhir Validasi ---

  // Buat objek data pembayaran
  const paymentData = {
    recipient: recipient,
    transactionId: transactionId,
    amount: parseFloat(amount), // Pastikan amount adalah angka
    currency: currency,
    description: description,
    timestamp: new Date().toISOString() // Tambahkan timestamp pembuatan QR
  };

  // Ubah objek data pembayaran menjadi string JSON
  // Inilah yang akan di-encode ke dalam QR code
  const textToEncode = JSON.stringify(paymentData);

  console.log("Generating QR for payment data:", textToEncode); // Log data ke konsol server

  // Opsi untuk generator QR code
  const qrOptions = {
    errorCorrectionLevel: 'H', // 'H' (High) untuk keandalan yang lebih baik pada QR pembayaran
    type: 'png',
    width: 256, // Ukuran yang cukup baik untuk dibaca
    margin: 1, // Margin kecil
    color: {
      dark: "#1a1a2e", // Warna gelap (misal: biru tua keunguan)
      light: "#FFFFFF"  // Warna terang (putih)
    }
  };

  try {
    // Generate QR code sebagai buffer PNG
    const qrCodeBuffer = await QRCode.toBuffer(textToEncode, qrOptions);

    // Set header content type ke image/png
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="pay-mu-qr-${transactionId}.png"`); // Nama file sugestif

    // Kirim buffer gambar sebagai response
    //res.status(200).send(qrCodeBuffer); // Sebelumnya

    // Kirim respons JSON dengan informasi pembayaran DAN QR code
    res.status(200).json({
        qrCode: qrCodeBuffer.toString('base64'),  // Kirim QR code sebagai base64
        transactionId: transactionId, // Kirim id transaksi
        amount: parseFloat(amount),
        currency: currency,
        description: description,
    });


  } catch (err) {
    console.error("Failed to generate QR code:", err);
    res.status(500).json({ error: 'Error generating QR code.' });
  }
});

// Middleware untuk menangani error 404 (Not Found) - setelah semua route lain
app.use((req, res, next) => {
  res.status(404).send("Sorry, can't find that!");
});

// Middleware penanganan error umum (harus diletakkan paling akhir)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});


// Jalankan server
app.listen(PORT, () => {
  console.log(`Pay-Mu Backend is running on http://localhost:${PORT}`);
  console.log(`Access the payment generator interface at: http://localhost:${PORT}/`);
});
