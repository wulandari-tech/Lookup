const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const session = require('express-session');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Konfigurasi Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'wanzofc-secret', // Gunakan variabel lingkungan atau default
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set ke true jika menggunakan HTTPS
}));

// Path untuk menyimpan data
const dataFilePath = path.join(__dirname, 'data.json');

// Fungsi untuk membaca data dari file JSON
function readData() {
    try {
        if (!fs.existsSync(dataFilePath)) {
            // Jika file tidak ada, buat dengan data default
            writeData({ users: [], apiKeys: [], admin: { username: 'awan', password: 'awan1' } });
        }
        const data = fs.readFileSync(dataFilePath, 'utf8');
        return JSON.parse(data) || { users: [], apiKeys: [], admin: { username: 'awan', password: 'awan1' } };
    } catch (error) {
        console.error("Error reading data file:", error); // Log the error
        return { users: [], apiKeys: [], admin: { username: 'awan', password: 'awan1' } }; // Return a default
    }
}

// Fungsi untuk menulis data ke file JSON
function writeData(data) {
    try {
        fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error("Error writing data file:", error); // Log the error
    }
}

// Inisialisasi Data (jika belum ada)
let data = readData();

// Fungsi untuk membuat API Key
function generateApiKey() {
    return crypto.randomBytes(20).toString('hex');
}

// Middleware Autentikasi Admin
function authenticateAdmin(req, res, next) {
  if (!req.session || !req.session.isAdmin) {
    return res.status(401).send('Unauthorized');
  }
  next();
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
  let apiKey = data.apiKeys.find(key => key.username === username);

  if (!apiKey) {
    apiKey = {
      username: username,
      key: generateApiKey(),
      expiration: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 hari
    };
    data.apiKeys.push(apiKey);
    writeData(data);
  }

  res.json({ success: true, apiKey: apiKey.key });
});

// Route untuk admin untuk membuat dan mengelola API Keys
app.post('/ADM/createkey', authenticateAdmin, (req, res) => {
    const { username, expirationDays } = req.body;

    if (!username) {
        return res.status(400).json({ success: false, message: 'Username harus diisi' });
    }

    let apiKey = data.apiKeys.find(key => key.username === username);

    if (apiKey) {
        return res.status(400).json({ success: false, message: 'User sudah memiliki API Key' });
    }

    // Buat API Key
    const newApiKey = {
        username: username,
        key: generateApiKey(),
        expiration: Date.now() + (expirationDays ? parseInt(expirationDays) : 7) * 24 * 60 * 60 * 1000 // Default 7 hari
    };

    data.apiKeys.push(newApiKey);
    writeData(data);
    res.json({ success: true, apiKey: newApiKey.key, message: `API Key untuk ${username} berhasil dibuat` });
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
    res.redirect('/login.html'); // Redirect to login if not admin
  }
});


app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});
