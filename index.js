const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const port = process.env.PORT || 3000;

app.use(express.json()); // Middleware untuk parsing JSON
app.use(express.static(path.join(__dirname, '.')));

const chatHistoryFile = 'chat_history.json';

function loadChatHistory() {
    try {
        if (fs.existsSync(chatHistoryFile)) {
            const data = fs.readFileSync(chatHistoryFile, 'utf8');
            return JSON.parse(data) || [];
        } else {
            // Jika file tidak ada, buat file dengan array kosong
            fs.writeFileSync(chatHistoryFile, JSON.stringify([], null, 2), 'utf8');
            return [];
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
        return [];
    }
}

function saveChatHistory(chatHistory) {
    try {
        fs.writeFileSync(chatHistoryFile, JSON.stringify(chatHistory, null, 2), 'utf8');
    } catch (error) {
        console.error('Error saving chat history:', error);
    }
}

let chatHistory = loadChatHistory();

io.on('connection', (socket) => {
    console.log('A user connected');
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Endpoint untuk mendapatkan riwayat chat
app.get('/chathistory', (req, res) => {
    res.json(chatHistory);
});

// Endpoint untuk mengirim pesan (menyimpan dan menyiarkan)
app.post('/chathistory', (req, res) => {
    const newMessage = req.body;
    chatHistory.push(newMessage);
    saveChatHistory(chatHistory);
    io.emit('chat message', newMessage); // Broadcast ke semua klien
    res.status(201).send('Message added'); // 201 Created
});

server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
