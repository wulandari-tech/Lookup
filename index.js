const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "https://wanzofc-chat.up.railway.app", // Allow any origin (for development - NOT recommended for production)
        methods: ["GET", "POST"]
    }
});
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

const chatHistoryFile = 'chat_history.json';

// --- Fungsi untuk Memuat dan Menyimpan Riwayat Chat (dengan Penanganan Error) ---
function loadChatHistory() {
    try {
        console.log('Loading chat history from:', chatHistoryFile);
        if (fs.existsSync(chatHistoryFile)) {
            const data = fs.readFileSync(chatHistoryFile, 'utf8');
            if (data.length === 0) {
                console.log('File exists, but is empty. Returning an empty array.');
                return [];
            }
            const parsedData = JSON.parse(data);
            console.log('Parsed chat history:', parsedData.length, 'messages');
            return parsedData || [];
        } else {
            console.log('File does not exist. Creating a new file with an empty array.');
            fs.writeFileSync(chatHistoryFile, JSON.stringify([], null, 2), 'utf8');
            return [];
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
        console.error('Error stack:', error.stack);
        return []; //  Return an empty array on error
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

// --- Inisialisasi Riwayat Chat ---
let chatHistory = loadChatHistory();

// --- Socket.IO Event Handlers ---
io.on('connection', (socket) => {
    console.log('A user connected, socket ID:', socket.id);

    // Kirim riwayat chat ke klien yang baru terhubung
    socket.emit('chat message', ...chatHistory); // Kirim semua pesan dari awal

    socket.on('disconnect', () => {
        console.log('User disconnected, socket ID:', socket.id);
    });

    // Terima pesan dari klien
    socket.on('chat message', (msg) => {
        console.log('Received chat message from client:', msg);

        // Tambahkan timestamp ke pesan (jika belum ada)
        if (!msg.timestamp) {
            const now = new Date();
            msg.timestamp = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}, ${now.getHours().toString().padStart(2, '0')}.${now.getMinutes().toString().padStart(2, '0')}.${now.getSeconds().toString().padStart(2, '0')}`;
        }

        // Simpan pesan ke riwayat chat
        chatHistory.push(msg);
        saveChatHistory(chatHistory);

        // Kirim pesan ke *semua* klien (termasuk pengirim)
        io.emit('chat message', msg);
    });
});

// --- Jalankan Server ---
server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    console.log(`Access the app at: http://localhost:${port}`);
    console.log('Ensure that the chat_history.json file is created in the same directory.');
});
