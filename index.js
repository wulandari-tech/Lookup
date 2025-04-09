const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*", //  Allow any origin (for development - NOT recommended for production)
        methods: ["GET", "POST"]
    }
});
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

const chatHistoryFile = 'chat_history.json';

function loadChatHistory() {
    try {
        console.log('Loading chat history from:', chatHistoryFile);
        if (fs.existsSync(chatHistoryFile)) {
            const data = fs.readFileSync(chatHistoryFile, 'utf8');
            console.log('File exists, read data:', data.length > 0 ? 'Data ada' : 'File kosong');
            const parsedData = JSON.parse(data);
            console.log('Parsed chat history:', parsedData.length, 'messages');
            return parsedData || [];
        } else {
            console.log('File does not exist. Creating new file.');
            fs.writeFileSync(chatHistoryFile, JSON.stringify([], null, 2), 'utf8');
            return [];
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
        console.error('Error stack:', error.stack);
        return [];
    }
}

function saveChatHistory(chatHistory) {
    try {
        console.log('Saving chat history:', chatHistory.length, 'messages');
        fs.writeFileSync(chatHistoryFile, JSON.stringify(chatHistory, null, 2), 'utf8');
        console.log('Chat history saved successfully.');
    } catch (error) {
        console.error('Error saving chat history:', error);
        console.error('Error stack:', error.stack);
    }
}

let chatHistory = loadChatHistory();

io.on('connection', (socket) => {
    console.log('A user connected, socket ID:', socket.id);

    // Kirim riwayat chat ke klien yang baru terhubung
    socket.emit('chat message', ...chatHistory); // Kirim semua pesan dari awal

    socket.on('disconnect', () => {
        console.log('User disconnected, socket ID:', socket.id);
    });

    // Terima pesan dari klien
    socket.on('chat message', (msg) => {
        console.log('Received message:', msg);

        // Simpan pesan ke riwayat chat
        chatHistory.push(msg);
        saveChatHistory(chatHistory);

        // Kirim pesan ke *semua* klien (termasuk pengirim)
        io.emit('chat message', msg);
    });
});

// Endpoint untuk mendapatkan riwayat chat (tidak diperlukan lagi)
// app.get('/chathistory', (req, res) => {
//     res.json(chatHistory);
// });

// Endpoint untuk mengirim pesan (tidak diperlukan lagi)
// app.post('/chathistory', (req, res) => {
//   //  Logika pengiriman pesan dipindahkan ke Socket.IO
//   //  res.status(201).send('Message added');
// });

server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    console.log(`Access the app at: http://localhost:${port}`);
});
