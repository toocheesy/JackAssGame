const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const tables = [];

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    socket.on('joinGame', ({ numPlayers, playerName }, callback) => {
        const name = playerName && playerName.trim() ? playerName.trim() : `Guest${Math.floor(Math.random() * 1000)}`;
        
        let table = tables.find(t => t.status === 'waiting' && t.numPlayers === numPlayers && t.players.length < numPlayers);
        if (!table) {
            table = {
                id: `TABLE${tables.length + 1}`,
                players: [],
                status: 'waiting',
                gameState: null,
                numPlayers: numPlayers
            };
            tables.push(table);
        }

        const position = table.players.length;
        table.players.push({ id: socket.id, name, position, isHuman: true });
        socket.join(table.id);
        io.to(table.id).emit('playerJoined', table.players);
        callback({ success: true, position, tableId: table.id });

        console.log(`${socket.id} joined table ${table.id} as ${name} (Lobby: ${numPlayers} players)`);

        if (table.players.length === table.numPlayers) {
            table.status = 'playing';
            io.to(table.id).emit('gameStarted', table.numPlayers, table.players);
            console.log(`Game started in table ${table.id} with ${table.numPlayers} players: ${table.players.map(p => p.name).join(', ')}`);
        }
    });

    socket.on('updateGameState', (tableId, gameState) => {
        const table = tables.find(t => t.id === tableId);
        if (!table) return;
        table.gameState = gameState;
        io.to(tableId).emit('gameStateUpdated', gameState);
    });

    socket.on('playerAction', (tableId, action) => {
        io.to(tableId).emit('playerAction', action);
    });

    socket.on('playerOut', (data) => {
        // Relay the playerOut event to the specific client
        io.to(data.playerId).emit('playerOut', { playerId: data.playerId });
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
                }
                console.log(`${playerName} (${socket.id}) disconnected`);
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));