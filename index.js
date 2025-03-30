const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const bcrypt = require('bcrypt');
const session = require('express-session');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// Middleware untuk parsing data form
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Konfigurasi Express Session
app.use(session({
    secret: 'your-super-secret-key-wanzofc', // Ganti dengan kunci rahasia yang sangat kuat
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true in production with HTTPS
}));


// File database (simulasi sederhana)
const DB_FILE = 'database.json';

// Fungsi untuk membaca data dari database
function readDB() {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Jika file tidak ada atau gagal dibaca, kembalikan struktur awal
        return { users: [], messages: [] };
    }
}

// Fungsi untuk menyimpan data ke database
function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Endpoint untuk pendaftaran
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const db = readDB();

    // Validasi sederhana
    if (!username || !password) {
        return res.status(400).json({ error: 'Username dan password harus diisi.' });
    }

    if (db.users.find(user => user.username === username)) {
        return res.status(400).json({ error: 'Username sudah digunakan.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10); // Hash password
        db.users.push({ username, password: hashedPassword }); // Simpan hash
        writeDB(db);
        res.status(201).json({ message: 'Pendaftaran berhasil.' });
    } catch (error) {
        console.error('Error hashing password:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});


// Endpoint untuk login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const db = readDB();
    const user = db.users.find(user => user.username === username);

    if (!user) {
        return res.status(400).json({ error: 'Username atau password salah.' });
    }

    try {
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (passwordMatch) {
            req.session.user = { username: user.username }; // Simpan informasi user di session
            res.status(200).json({ message: 'Login berhasil.' });
        } else {
            res.status(400).json({ error: 'Username atau password salah.' });
        }
    } catch (error) {
        console.error('Error comparing password:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// Middleware untuk mengecek apakah user sudah login
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        next(); // Lanjutkan jika sudah login
    } else {
        res.redirect('/login'); // Redirect ke halaman login jika belum
    }
}

// Endpoint untuk logout
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Logout gagal.');
        }
        res.redirect('/login'); // Redirect ke halaman login setelah logout
    });
});


// Route untuk menampilkan halaman home (setelah login)
app.get('/home', isAuthenticated, (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Route untuk menampilkan halaman login (jika belum login)
app.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect('/home');
    }
    res.sendFile(__dirname + '/login.html'); // Render halaman login
});


// Socket.IO
io.on('connection', (socket) => {
    console.log('User connected');

    // Membaca history chat saat koneksi baru
    const db = readDB();
    socket.emit('chat history', db.messages);

    socket.on('chat message', (msg) => {
        const username = socket.handshake.session?.user?.username || 'Guest';

        const db = readDB();
        db.messages.push({ username, text: msg, timestamp: new Date() });
        writeDB(db);

        io.emit('chat message', { username, text: msg, timestamp: new Date() });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

server.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
