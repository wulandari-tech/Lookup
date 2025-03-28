const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const axios = require('axios');
const cors = require('cors'); // Import modul cors

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Konfigurasi Session
app.use(session({
    secret: process.env.SESSION_SECRET || 'wanzofc-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Aktifkan CORS untuk semua origin (HANYA UNTUK PENGEMBANGAN.  BATASI DI PRODUKSI!)
app.use(cors());

// Atau, untuk membatasi origin (contoh):
// const corsOptions = {
//   origin: 'https://wanzofc-update-production.up.railway.app', // Ganti dengan domain Anda
//   methods: 'GET,POST', // Batasi metode HTTP
//   allowedHeaders: ['Content-Type', 'x-api-key'] // Batasi header
// };
// app.use(cors(corsOptions));



// Path untuk menyimpan data
const dataFilePath = path.join(__dirname, 'data.json');

// Fungsi untuk membaca data dari file JSON
function readData() {
    try {
        if (!fs.existsSync(dataFilePath)) {
            writeData({
                users: [],
                apiKeys: [],
                admin: { username: 'awan', password: 'awan1' },
                runningText: 'Selamat Datang di Wanzofc API!',
                redemptionCodes: [], // Tambahkan array untuk kode redeem
                customApiKeys: [] // Tambahkan array untuk API Key kustom
            });
        }
        const data = fs.readFileSync(dataFilePath, 'utf8');
        return JSON.parse(data) || {
            users: [],
            apiKeys: [],
            admin: { username: 'awan', password: 'awan1' },
            runningText: 'Gagal memuat running text!',
            redemptionCodes: [],
            customApiKeys: []
        };
    } catch (error) {
        console.error("Error reading data file:", error);
        return {
            users: [],
            apiKeys: [],
            admin: { username: 'awan', password: 'awan1' },
            runningText: 'Gagal memuat running text!',
            redemptionCodes: [],
            customApiKeys: []
        };
    }
}

// Fungsi untuk menulis data ke file JSON
function writeData(data) {
    try {
        fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error("Error writing data file:", error);
    }
}

// Inisialisasi Data (jika belum ada)
let data = readData();

// Fungsi untuk membuat API Key (4 atau 6 digit)
function generateApiKey(length = 6) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let apiKey = '';
    for (let i = 0; i < length; i++) {
        apiKey += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return apiKey;
}


// Middleware Autentikasi Admin
function authenticateAdmin(req, res, next) {
  if (!req.session || !req.session.isAdmin) {
    return res.status(401).send('Unauthorized');
  }
  next();
}

// Middleware Autentikasi API Key
function authenticateApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({ success: false, message: 'API Key tidak ditemukan' });
    }

    // Cari API Key di data.apiKeys
    const validApiKey = data.apiKeys.find(key => key.key === apiKey);
    if (validApiKey) {
        // Key ditemukan, lanjutkan
        return next();
    }

    // Periksa API Key kustom (jika ada)
    const customApiKey = data.customApiKeys.find(key => key.key === apiKey);

    if(customApiKey) {
        return next();
    }

    // Jika tidak ditemukan
    return res.status(401).json({ success: false, message: 'API Key tidak valid' });

}

// Route untuk Login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === data.admin.username && password === data.admin.password) {
      req.session.isAdmin = true;
      res.json({ success: true, message: 'Login berhasil' });
    } else {
      res.status(401).json({ success: false, message: 'Username atau password salah' });
    }
  });

  // Route untuk Logout
  app.get('/logout', (req, res) => {
    req.session.destroy(err => {
      if (err) {
        return res.status(500).send('Gagal logout');
      }
      res.redirect('/login.html');
    });
  });

// Route untuk Sign Up
app.post('/signup', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username dan password harus diisi' });
  }

  // Cek apakah username sudah ada
  if (data.users.some(user => user.username === username)) {
    return res.status(400).json({ success: false, message: 'Username sudah digunakan' });
  }

  // Tambahkan user baru
  data.users.push({ username, password });
  writeData(data);
  res.json({ success: true, message: 'Registrasi berhasil, silakan login' });
});

// Route untuk mendapatkan API Key (setelah login/daftar)
app.post('/api/getkey', (req, res) => {
    const { username, password } = req.body;

    const user = data.users.find(u => u.username === username && u.password === password);

    if (!user) {
        return res.status(401).json({ success: false, message: 'Username atau password salah' });
    }

    // Periksa apakah pengguna sudah memiliki API Key
    let apiKeyData = data.apiKeys.find(key => key.username === username);

    if (!apiKeyData) {
        const newApiKey = generateApiKey(Math.random() < 0.5 ? 4 : 6);  // 4 atau 6 digit
        apiKeyData = {
            username: username,
            key: newApiKey,
            expiration: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 hari
        };
        data.apiKeys.push(apiKeyData);
        writeData(data);
    }

    res.json({ success: true, apiKey: apiKeyData.key });
});

// Route untuk Kode Redeem
app.post('/api/redeem', (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ success: false, message: 'Kode redeem diperlukan' });
    }

    const redemptionCode = data.redemptionCodes.find(c => c.code === code && !c.used); // Pastikan belum digunakan
    if (!redemptionCode) {
        return res.status(400).json({ success: false, message: 'Kode redeem tidak valid' });
    }

    const username = redemptionCode.username;
    // Periksa apakah pengguna sudah memiliki API Key
    let apiKeyData = data.apiKeys.find(key => key.username === username);

    if (!apiKeyData) {
        const newApiKey = generateApiKey(6);
        apiKeyData = {
            username: username,
            key: newApiKey,
            expiration: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 hari
        };
        data.apiKeys.push(apiKeyData);
        writeData(data);
    }

    // Tandai kode redeem sebagai sudah digunakan
    redemptionCode.used = true;
    writeData(data);

    res.json({ success: true, apiKey: apiKeyData.key, message: 'Kode redeem berhasil digunakan' });
});


// Route untuk Admin - Mengelola Teks Berjalan
app.post('/ADM/runningtext', authenticateAdmin, (req, res) => {
    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ success: false, message: 'Teks harus diisi' });
    }
    data.runningText = text;
    writeData(data);
    res.json({ success: true, message: 'Teks berjalan berhasil diubah' });
});

// Route untuk Admin - Membuat Kode Redeem
app.post('/ADM/redeemcode', authenticateAdmin, (req, res) => {
  const { code, username } = req.body;

  if (!code || !username) {
    return res.status(400).json({ success: false, message: 'Kode dan username harus diisi' });
  }

  // Cek jika kode sudah ada
  if (data.redemptionCodes.some(c => c.code === code)) {
    return res.status(400).json({ success: false, message: 'Kode sudah digunakan' });
  }

  data.redemptionCodes.push({ code, username, used: false }); // Simpan kode redeem
  writeData(data);
  res.json({ success: true, message: 'Kode redeem berhasil dibuat' });
});

// Route untuk Admin - Membuat API Key Kustom
app.post('/ADM/createcustomkey', authenticateAdmin, (req, res) => {
    const { username, apiKey, expirationDays } = req.body;

    if (!username || !apiKey) {
        return res.status(400).json({ success: false, message: 'Username dan API Key harus diisi' });
    }

    // Cek jika user sudah memiliki API Key
    if (data.apiKeys.some(key => key.username === username)) {
        return res.status(400).json({ success: false, message: 'User sudah memiliki API Key' });
    }

     // Cek jika API key sudah ada
    if (data.customApiKeys.some(key => key.key === apiKey)) {
        return res.status(400).json({ success: false, message: 'API Key sudah digunakan' });
    }

    const newApiKey = {
        username: username,
        key: apiKey,
        expiration: Date.now() + (expirationDays ? parseInt(expirationDays) : 7) * 24 * 60 * 60 * 1000 // Default 7 hari
    };

    data.customApiKeys.push(newApiKey);
    writeData(data);

    res.json({ success: true, message: `API Key kustom untuk ${username} berhasil dibuat` });
});

// Route untuk Admin - Mendapatkan daftar kode redeem
app.get('/ADM/redeemcodes', authenticateAdmin, (req, res) => {
  res.json(data.redemptionCodes);
});

// Route untuk Admin - Mendapatkan daftar API Key Kustom
app.get('/ADM/customapikeys', authenticateAdmin, (req, res) => {
  res.json(data.customApiKeys);
});


// Route untuk melihat semua API Key (hanya untuk admin)
app.get('/ADM/keys', authenticateAdmin, (req, res) => {
  res.json(data.apiKeys);
});

// Route untuk menghapus API Key (hanya untuk admin)
app.post('/ADM/deletekey', authenticateAdmin, (req, res) => {
  const { username } = req.body;

  data.apiKeys = data.apiKeys.filter(key => key.username !== username);
  writeData(data);
  res.json({ success: true, message: `API Key untuk ${username} berhasil dihapus` });
});

// Route untuk mendapatkan informasi API Key (hanya untuk admin)
app.get('/ADM/keyinfo/:username', authenticateAdmin, (req, res) => {
  const { username } = req.params;
  const apiKey = data.apiKeys.find(key => key.username === username);

  if (!apiKey) {
    return res.status(404).json({ success: false, message: 'API Key tidak ditemukan' });
  }

  res.json(apiKey);
});

// Endpoint yang dilindungi (contoh)
app.get('/api/protected', authenticateApiKey, (req, res) => {
    res.json({ success: true, message: 'Akses berhasil!  API Key valid.' });
});

// Endpoint untuk mendapatkan running text
app.get('/api/runningtext', (req, res) => {
    res.json({ runningText: data.runningText });
});

// Endpoint untuk Testing API (diubah)
app.post('/api/checkgopay', authenticateApiKey, async (req, res) => {  // Mengubah dari GET menjadi POST
    const accountNumber = req.body.account_number; // Ambil dari body
    if (!accountNumber) {
        return res.status(400).json({ status: false, error: 'Parameter "account_number" diperlukan.' });
    }

    try {
        const response = await axios.get('https://api.siputzx.my.id/api/check/gopay', {
            params: { account_number: accountNumber },
        });

        res.json(response.data); // Kirim response dari API eksternal
    } catch (error) {
        console.error('Error calling external API:', error);
        res.status(500).json({ status: false, error: 'Terjadi kesalahan saat menghubungi API eksternal.' });
    }
});


// Menangani request untuk file HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/signin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'signin.html'));
});

app.get('/admin.html', (req, res) => {
  if (req.session && req.session.isAdmin) {
    res.sendFile(path.join(__dirname, 'admin.html'));
  } else {
    res.redirect('/admin.html'); // Redirect to login if not admin
  }
});

app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});
