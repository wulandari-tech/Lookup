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
        const data = fs.readFileSync(chatHistoryFile, 'utf8');
        return JSON.parse(data) || [];
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
app.get('/chathistory', (req, res) => {
    res.json(chatHistory);
});
app.post('/chathistory', (req, res) => {
    const newMessage = req.body;
    chatHistory.push(newMessage);
    saveChatHistory(chatHistory);
    io.emit('chat message', newMessage); 
    res.status(201).send('Message added'); 
});
server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
