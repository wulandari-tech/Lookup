const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

const chatHistoryFile = 'chat_history.json';

function loadChatHistory() {
    try {
        if (fs.existsSync(chatHistoryFile)) {
            const data = fs.readFileSync(chatHistoryFile, 'utf8');
            const parsedData = JSON.parse(data);
            console.log('Loaded chat history:', parsedData); // Logging
            return parsedData || [];
        } else {
            fs.writeFileSync(chatHistoryFile, JSON.stringify([], null, 2), 'utf8');
            console.log('Created new chat history file.'); // Logging
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
        console.log('Saved chat history.'); // Logging
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

app.get('/chathistory', (req, res) => {
    console.log('GET /chathistory');  // Logging
    res.json(chatHistory);
});

app.post('/chathistory', (req, res) => {
    console.log('POST /chathistory', req.body);  // Logging
    const newMessage = req.body;
    chatHistory.push(newMessage);
    saveChatHistory(chatHistory);
    io.emit('chat message', newMessage);
    res.status(201).send('Message added');
});

server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
