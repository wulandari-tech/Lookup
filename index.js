const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));

function readDB() {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'db.json'), 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading db.json:', error);
        return { users: [], messages: [], polls:[] }; // Default value, add polls
    }
}

function writeDB(data) {
    try {
        fs.writeFileSync(path.join(__dirname, 'db.json'), JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing to db.json:', error);
    }
}

io.on('connection', (socket) => {
    console.log('Pengguna terhubung:', socket.id);

    // Load chat history when a user connects
    const db = readDB();
    socket.emit('chatHistory', db.messages);

    socket.on('userJoin', (username, callback) => {
        const db = readDB();
        const newUser = { id: socket.id, username: username, position: { x: 0, y: 0, z: 0 } };
        db.users.push(newUser);
        writeDB(db);
        socket.username = username;
        io.emit('userList', db.users);
        callback({ status: 'success', message: 'User joined', user: newUser });
    });

    socket.on('chatMessage', (msg) => {
        const db = readDB();
        const newMessage = {
            id: socket.id,
            username: socket.username,
            message: msg,
            timestamp: new Date()
        };
        db.messages.push(newMessage);
        writeDB(db);
        io.emit('message', newMessage);
    });

    socket.on('userMove', (position) => {
        const db = readDB();
        const userIndex = db.users.findIndex(user => user.id === socket.id);
        if (userIndex !== -1) {
            db.users[userIndex].position = position;
            writeDB(db);
            socket.broadcast.emit('userMoved', { id: socket.id, position: position });
        }
    });

    // Polling Event - Example
    socket.on('startPoll', (pollData) => { // Contoh sederhana untuk start poll dari server
        const db = readDB();
        const newPoll = {
            id: Date.now(), // Generate a simple ID
            question: pollData.question,
            options: pollData.options,
            votes: pollData.options.map(() => 0), // Initialize votes
            totalVotes: 0,
            voters: [] // Store voters to prevent multiple votes
        };

        db.polls = db.polls || [];
        db.polls.push(newPoll);
        writeDB(db);
        io.emit('newPoll', newPoll); // Send to all clients
    });

    socket.on('vote', (voteData) => {
        const db = readDB();
        const poll = db.polls.find(p => p.id === voteData.pollId);
        if (poll && voteData.optionIndex >= 0 && voteData.optionIndex < poll.options.length && !poll.voters.includes(socket.id)) {
           poll.votes[voteData.optionIndex]++;
           poll.totalVotes++;
           poll.voters.push(socket.id); // Mark user as voted
           writeDB(db);
           io.emit('pollResults', {
                question: poll.question,
                options: poll.options,
                votes: poll.votes,
                totalVotes: poll.totalVotes
           });
        }
    });
    socket.on('disconnect', () => {
        console.log('Pengguna terputus:', socket.id);
        const db = readDB();
        db.users = db.users.filter(user => user.id !== socket.id);
        writeDB(db);
        io.emit('userList', db.users);
    });
});

server.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
