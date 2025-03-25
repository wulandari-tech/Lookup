const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const QRCode = require('qrcode'); // For generating QR code (if needed for basic display)

// Integrasi dengan penyedia pembayaran (contoh)
// const allpayProvider = require('./allpayProvider'); // File terpisah (lihat di bawah)

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// Konfigurasi Session
app.use(
    session({
        secret: 'wanzofc', // Ganti dengan secret key yang aman
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: false, // Set to true if using HTTPS
            httpOnly: true, // Prevent client-side access to the cookie
            maxAge: 1000 * 60 * 60, // 1 jam
        },
    })
);

// Dummy database (sebaiknya gunakan database nyata)
const users = []; // { id, username, passwordHash, isAdmin, balance }
let nextUserId = 1;
const transactions = []; // { id, userId, amount, currency, description, status, timestamp, paymentMethod, allpayQrData }

// Middleware Authentication
const authMiddleware = (req, res, next) => {
    if (req.session && req.session.userId) {
        // User is authenticated
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized: Please login.' });
    }
};

// Middleware Admin
const adminMiddleware = (req, res, next) => {
    if (req.session && req.session.userId) {
        const user = users.find((u) => u.id === req.session.userId);
        if (user && user.isAdmin) {
            next();
        } else {
            res.status(403).json({ error: 'Forbidden: Admin access required.' });
        }
    } else {
        res.status(401).json({ error: 'Unauthorized: Please login.' });
    }
};

// Endpoint untuk menampilkan halaman utama (index.html)
app.get('/', (req, res) => {
    // Serve index.html.  You'll need to create this file.
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Endpoint Register
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    if (users.some(user => user.username === username)) {
      return res.status(400).json({ error: 'Username already exists.' });
    }

    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const newUser = {
            id: nextUserId++,
            username,
            passwordHash,
            isAdmin: users.length === 0, // Pertama kali daftar, jadi admin
            balance: 0, // Initial balance
        };
        users.push(newUser);
        console.log('User registered:', newUser.username);
        res.status(201).json({ message: 'Registration successful. Please login.' });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Registration failed.' });
    }
});

// Endpoint Login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = users.find(user => user.username === username);
    if (!user) {
        return res.status(400).json({ error: 'Invalid credentials.' });
    }

    try {
        const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        if (passwordMatch) {
            req.session.userId = user.id; // Create session
            console.log('User logged in:', user.username);
            res.json({ message: 'Login successful.', userId: user.id, username: user.username, isAdmin: user.isAdmin });
        } else {
            res.status(400).json({ error: 'Invalid credentials.' });
        }
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ error: 'Login failed.' });
    }
});

// Endpoint Logout
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).json({ error: 'Logout failed.' });
        }
        console.log('User logged out');
        res.json({ message: 'Logout successful.' });
    });
});

// Endpoint Profile (protected)
app.get('/profile', authMiddleware, (req, res) => {
    const user = users.find(u => u.id === req.session.userId);
    if (user) {
        res.json({
            username: user.username,
            balance: user.balance, // Contoh
            isAdmin: user.isAdmin,
            // ... other profile information
        });
    } else {
        res.status(404).json({ error: 'User not found.' });
    }
});

// Endpoint untuk generate QR code pembayaran yang bisa di-scan ke all payment
app.post('/api/allpay-qr', authMiddleware, async (req, res) => {
    const { amount, currency = 'IDR', description, paymentMethod } = req.body; // Ex: DANA, Gopay
    const userId = req.session.userId;
    const user = users.find(u => u.id === userId);

    // --- Validasi Input ---
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: 'Invalid or missing "amount" parameter. Must be a positive number.' });
    }

    if (!paymentMethod) {
        return res.status(400).json({ error: 'Payment method is required.' });
    }

    // 1. Generate Transaction ID (Unik)
    const transactionId = `PM-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // 2. Format Data untuk All Payment (contoh: DANA)
    // Ini akan bervariasi tergantung pada layanan pembayaran
    // Anda perlu berkonsultasi dengan dokumentasi layanan
    let allpayQrData;
    if (paymentMethod.toLowerCase() === 'dana') {
      const danaPayload = {
        amount: parseFloat(amount),
        currency: currency,
        description: description,
        transactionId: transactionId,
        merchantCode: "YOUR_DANA_MERCHANT_CODE",  // Ganti dengan merchant code DANA Anda
        // ... other required parameters by DANA
      };
      //console.log(JSON.stringify(danaPayload));
       // 3.  Generate QR code using AllPay (example)
        try {
           // const qrCodeBase64 = await allpayProvider.generateDanaQr(danaPayload); // Function in allpayProvider.js
           // Hardcode base64 supaya tidak harus register ke payment gateway
           const qrCodeBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADIAQMAAABNJi44AAAABGdBTUEAALGPC/cAAAACBJREFUCNdjYGBgEAj4gJzCgYGNjAAALtQBB3j7pXIAAAAASUVORK5CYII=';
            const newTransaction = {
                id: transactions.length + 1,
                userId: userId,
                amount: parseFloat(amount),
                currency: currency,
                description: description,
                status: 'pending', // or 'created'
                timestamp: new Date().toISOString(),
                paymentMethod: paymentMethod,
                allpayQrData: danaPayload, // Simpan payload yang digunakan
            };
            transactions.push(newTransaction);

            res.json({
                qrCode: qrCodeBase64,  // QR code base64 string
                transactionId: transactionId,
                amount: parseFloat(amount),
                currency: currency,
                description: description,
                paymentMethod: paymentMethod,
            });

        } catch (error) {
            console.error("Error generating DANA QR:", error);
            return res.status(500).json({ error: "Failed to generate DANA QR code" });
        }
    } else if (paymentMethod.toLowerCase() === 'gopay') {
        // Logika untuk Gopay...  Mirip dengan DANA, tapi gunakan
        // API yang berbeda (dari GoPay)
        //  const gopayPayload = { ... }
        //  const qrCodeBase64 = await allpayProvider.generateGopayQr(gopayPayload)
        return res.status(501).json({ error: "GoPay integration not yet implemented" }); // Not Implemented
    } else {
        return res.status(400).json({ error: "Unsupported payment method" });
    }
});


// Admin Dashboard (protected)
app.get('/admin/dashboard', adminMiddleware, (req, res) => {
    const totalUsers = users.length;
    const totalTransactions = transactions.length;
    res.json({ totalUsers, totalTransactions });
});

// Admin Transactions (protected)
app.get('/admin/transactions', adminMiddleware, (req, res) => {
    res.json({ transactions });
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
