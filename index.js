const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;

app.use(express.static('.'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const apiKey = 'C68xIhWt'; // Ganti dengan API key Anda jika perlu
const baseURL = 'https://api.only-awan.biz.id/api/ai/gpt3?prompt=kamu%20adalah%20wanzofc%20Islam%20yang%20sangat%20ramah%20dan%20menggunakan%20huruf%20kecil%20semua%20%20etiap%20pesan%20yang%20ingin%20kamu%20bales,%20Jia%20ada%20yang%20nanya%20nama%20kamu%20itu%20wanzofc%20dan%20kasih%20nomor%20nya%20kamu%200895402567224'; // URL dengan prompt sudah ter-encode

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('chat message', async (msg) => {
        console.log('message: ' + msg);

        try {
            const fullURL = `${baseURL}&content=${msg}&apikey=${apiKey}`;
            const response = await axios.get(fullURL);

            if (response.data && response.data.data && response.data.data.status && response.data.data.data) {
                let botResponse = response.data.data.data;
                console.log('GPT-3 Response:', botResponse);
                io.emit('chat message', botResponse);
            } else {
                console.error('Error: Invalid response format from GPT-3 API:', response.data);
                io.emit('chat message', 'Maaf, terjadi kesalahan saat mendapatkan respons.');
            }

        } catch (error) {
            console.error('Error calling GPT-3 API:', error);
            io.emit('chat message', 'Maaf, terjadi kesalahan saat berkomunikasi dengan chatbot.');
        }
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

server.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});
