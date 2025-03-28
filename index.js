const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const axios = require('axios');
const cors = require('cors');

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

// Aktifkan CORS (HANYA UNTUK PENGEMBANGAN.  BATASI DI PRODUKSI!)
app.use(cors());

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
                runningText: {}, // Teks berjalan per user
                redemptionCodes: [], // Kode redeem
                customApiKeys: [] // API Key kustom
            });
        }
        const data = fs.readFileSync(dataFilePath, 'utf8');
        return JSON.parse(data) || {
            users: [],
            apiKeys: [],
            admin: { username: 'awan', password: 'awan1' },
            runningText: {}, // Teks berjalan per user
            redemptionCodes: [],
            customApiKeys: []
        };
    } catch (error) {
        console.error("Error reading data file:", error);
        return {
            users: [],
            apiKeys: [],
            admin: { username: 'awan', password: 'awan1' },
            runningText: {}, // Teks berjalan per user
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

// Middleware Autentikasi API Key
function authenticateApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({ success: false, message: 'API Key tidak ditemukan' });
    }

    let validApiKey;
    // Prioritaskan API Key kustom
    validApiKey = data.customApiKeys.find(key => key.key === apiKey);

    if (!validApiKey) {
        // Jika tidak ada API key kustom, cari API key default
        validApiKey = data.apiKeys.find(key => key.key === apiKey);
    }


    if (validApiKey) {
        return next();
    }

    // Jika tidak ditemukan
    return res.status(401).json({ success: false, message: 'API Key tidak valid' });
}


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

// Route untuk Login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = data.users.find(u => u.username === username && u.password === password);

    if (!user) {
        return res.status(401).json({ success: false, message: 'Username atau password salah' });
    }

    // Set session setelah login berhasil
    req.session.loggedIn = true;
    req.session.username = username; // Simpan username di session

    // Dapatkan API Key (prioritaskan API Key kustom)
    let apiKey = '';
    const customApiKey = data.customApiKeys.find(key => key.username === username);
    if (customApiKey) {
        apiKey = customApiKey.key;
    } else {
        // Jika tidak ada API Key kustom, buat atau gunakan yang sudah ada
        let apiKeyData = data.apiKeys.find(key => key.username === username);
        if (!apiKeyData) {
            const newApiKey = generateApiKey(Math.random() < 0.5 ? 4 : 6);
            apiKeyData = {
                username: username,
                key: newApiKey,
                expiration: Date.now() + 7 * 24 * 60 * 60 * 1000
            };
            data.apiKeys.push(apiKeyData);
            writeData(data);
        }
        apiKey = apiKeyData.key;
    }

    res.json({ success: true, message: 'Login berhasil', apiKey });
});

// Route untuk Logout
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Gagal logout');
        }
        res.json({ success: true, message: 'Logout berhasil' });
    });
});


// Route untuk mendapatkan API Key (setelah login/daftar)
app.post('/api/getkey', (req, res) => {
    if (!req.session.loggedIn || !req.session.username) {
        return res.status(401).json({ success: false, message: 'Silakan login terlebih dahulu.' });
    }

    const username = req.session.username;

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
app.post('/ADM/runningtext', (req, res) => {  // Hapus authentication
    const { username, text } = req.body;
    if (!username || !text) {
        return res.status(400).json({ success: false, message: 'Username dan teks harus diisi' });
    }

    // Simpan teks berjalan untuk pengguna tertentu
    data.runningText[username] = text;
    writeData(data);
    res.json({ success: true, message: 'Teks berjalan berhasil diubah' });
});

// Route untuk Admin - Membuat Kode Redeem
app.post('/ADM/redeemcode', (req, res) => { // Hapus authentication
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
app.post('/ADM/createcustomkey', (req, res) => { // Hapus authentication
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

    // Simpan API Key kustom
    data.customApiKeys.push({ username, key: apiKey, expiration: Date.now() + (expirationDays ? parseInt(expirationDays) : 7) * 24 * 60 * 60 * 1000 });
    writeData(data);
    res.json({ success: true, message: `API Key kustom untuk ${username} berhasil dibuat` });
});

// Route untuk Admin - Mendapatkan daftar kode redeem
app.get('/ADM/redeemcodes', (req, res) => { // Hapus authentication
  res.json(data.redemptionCodes);
});

// Route untuk Admin - Mendapatkan daftar API Key Kustom
app.get('/ADM/customapikeys', (req, res) => { // Hapus authentication
  res.json(data.customApiKeys);
});

// Route untuk melihat semua API Key (hanya untuk admin)
app.get('/ADM/keys', (req, res) => { // Hapus authentication
  res.json(data.apiKeys);
});

// Route untuk melihat daftar users (PERINGATAN: TIDAK AMAN!)
app.get('/ADM/users', (req, res) => { // Hapus authentication
    res.json(data.users.map(user => ({ username: user.username, password: user.password })));
});

// Route untuk menghapus API Key (hanya untuk admin)
app.post('/ADM/deletekey', (req, res) => { // Hapus authentication
  const { username } = req.body;

  data.apiKeys = data.apiKeys.filter(key => key.username !== username);
  writeData(data);
  res.json({ success: true, message: `API Key untuk ${username} berhasil dihapus` });
});


// Route untuk mendapatkan informasi API Key (hanya untuk admin)
app.get('/ADM/keyinfo/:username', (req, res) => { // Hapus authentication
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
    const username = req.session.username;
    const runningText = data.runningText[username] || 'Selamat datang!'; // Teks default jika tidak ada
    res.json({ runningText });
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

// Route untuk mengakses halaman admin (tanpa login)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
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


app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});
