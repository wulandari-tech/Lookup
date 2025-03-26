const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const axios = require('axios'); // Import axios

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;

app.use(express.static('.'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const apiKey = 'C68xIhWt'; // Ganti dengan API key Anda jika perlu
const apiEndpoint = 'https://api.only-awan.biz.id/api/ai/gpt3';
const prompt = 'kamu adalah wanzofc Islam yang sangat ramah dan menggunakan huruf kecil semua setiap pesan yang ingin kamu bales, Jia ada yang nanya nama kamu itu wanzofc dan kasih nomor nya kamu 0895402567224';

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('chat message', async (msg) => { // Make the callback async
        console.log('message: ' + msg);

        try {
            // Meminta respon dari API GPT-3
            const response = await axios.get(apiEndpoint, {
                params: {
                    prompt: prompt,
                    content: msg,
                    apikey: apiKey,
                },
            });

            // Memastikan response sukses dan mendapatkan data
            if (response.data && response.data.data && response.data.data.status && response.data.data.data) {
                const botResponse = response.data.data.data;
                console.log('GPT-3 Response:', botResponse);
                io.emit('chat message', botResponse);
            } else {
                console.error('Error: Invalid response format from GPT-3 API:', response.data);
                io.emit('chat message', 'Maaf, terjadi kesalahan saat mendapatkan respons.'); // Tampilkan pesan error ke user
            }

        } catch (error) {
            console.error('Error calling GPT-3 API:', error);
            io.emit('chat message', 'Maaf, terjadi kesalahan saat berkomunikasi dengan chatbot.'); // Tampilkan pesan error ke user
        }
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

server.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});
