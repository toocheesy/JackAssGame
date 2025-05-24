// server.js (Updated for 1 human + 3 bots, no waiting)
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const tables = [];

app.use(express.static('public'));

// ... keep your Card, BotPlayer, and GameManager classes unchanged
// (the ones you've pasted above remain untouched and fully intact)

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    socket.on('joinGame', ({ playerName }, callback) => {
        const name = playerName && playerName.trim() ? playerName.trim() : `Guest${Math.floor(Math.random() * 1000)}`;
        const tableId = `TABLE-${Date.now()}`;

        const players = [{ id: socket.id, name, isHuman: true }];
        for (let i = 1; i < 4; i++) {
            const bot = new BotPlayer(`BOT${Date.now()}${i}`, i, 4);
            players.push(bot);
        }

        const gameManager = new GameManager(tableId, 4, players);
        gameManager.startGame();

        tables.push({ id: tableId, players, gameManager });

        socket.join(tableId);
        io.to(tableId).emit('gameStarted', 4, players, gameManager.getState());
        callback({ success: true, tableId });

        const current = players[gameManager.currentPlayer];
        if (!current.isHuman) {
            current.takeTurn(gameManager, io, tableId);
        }
    });

    socket.on('playerAction', (tableId, action) => {
        const table = tables.find(t => t.id === tableId);
        if (!table || !table.gameManager) return;

        const playerIndex = table.players.findIndex(p => p.id === socket.id);
        if (playerIndex === -1 || playerIndex !== table.gameManager.currentPlayer) return;

        if (action.type === 'pickCard') {
            const success = table.gameManager.pickCard(action.playerIndex, action.cardIndex, io);
            if (success) {
                io.to(tableId).emit('gameStateUpdated', table.gameManager.getState());
                const next = table.players[table.gameManager.currentPlayer];
                if (!next.isHuman) {
                    next.takeTurn(table.gameManager, io, tableId);
                }
            }
        } else if (action.type === 'shuffleHand') {
            table.gameManager.shuffleHand(playerIndex);
            io.to(tableId).emit('gameStateUpdated', table.gameManager.getState());
        }
    });

    socket.on('disconnect', () => {
        for (let i = 0; i < tables.length; i++) {
            const table = tables[i];
            const playerIndex = table.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                const playerName = table.players[playerIndex].name;
                table.players.splice(playerIndex, 1);
                io.to(table.id).emit('playerLeft', socket.id);
                if (table.players.length === 0) {
                    tables.splice(i, 1);
                    console.log(`Table ${table.id} deleted`);
                } else if (table.gameManager && table.gameManager.currentPlayer === playerIndex) {
                    table.gameManager.nextPlayer();
                    io.to(table.id).emit('gameStateUpdated', table.gameManager.getState());
                }
                console.log(`${playerName} (${socket.id}) disconnected`);
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
