const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const tables = [];

app.use(express.static('public'));

class Card {
    constructor(value, suit) {
        this.value = value;
        this.suit = suit;
        this.isJoker = value === 'JOKER';
    }
    getDisplayValue() {
        if (this.isJoker) return 'JOKER';
        if (this.value === 1) return 'A';
        if (this.value === 13) return 'K';
        if (this.value === 12) return 'Q';
        return this.value;
    }
    getColor() {
        return (this.suit === '♥' || this.suit === '♦' || this.isJoker) ? 'red' : 'black';
    }
    matches(otherCard) {
        if (this.isJoker || otherCard.isJoker) return false;
        return this.value === otherCard.value;
    }
}

class BotPlayer {
    constructor(id, position, numPlayers) {
        this.id = id;
        this.name = `Bot${position + 1}`;
        this.position = position;
        this.isHuman = false;
        this.hand = [];
        this.pairs = [];
        this.isActive = false;
        this.isLoser = false;
        this.numPlayers = numPlayers;
    }

    takeTurn(gameManager, io, tableId) {
        if (!gameManager.players.find(p => p.id === this.id).isActive) return;
        const targetIndex = gameManager.findNextPlayerWithCards(gameManager.currentPlayer);
        if (targetIndex === -1) {
            gameManager.nextPlayer();
            io.to(tableId).emit('gameStateUpdated', gameManager.getState());
            return;
        }
        const targetHand = gameManager.players[targetIndex].hand;
        const cardIndex = Math.floor(Math.random() * targetHand.length);
        setTimeout(() => {
            const success = gameManager.pickCard(targetIndex, cardIndex, io);
            if (success) {
                io.to(tableId).emit('gameStateUpdated', gameManager.getState());
            }
        }, 2000);
    }
}

class GameManager {
    constructor(tableId, numPlayers, players) {
        this.tableId = tableId;
        this.numPlayers = numPlayers;
        this.players = players.map(p => ({
            id: p.id,
            name: p.name,
            hand: [],
            pairs: [],
            isHuman: p.isHuman,
            isActive: false,
            isLoser: false
        }));
        this.currentPlayer = 0;
        this.gameOver = false;
        this.winner = null;
        this.loser = -1;
    }

    createDeck() {
        const suits = ['♠', '♥', '♦', '♣'];
        const deck = [];
        for (let suit of suits) {
            for (let value = 1; value <= 13; value++) {
                if (value !== 11) {
                    deck.push(new Card(value, suit));
                }
            }
        }
        deck.push(new Card('JOKER', null));
        return this.shuffleDeck(deck);
    }

    shuffleDeck(deck) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    dealCards() {
        const deck = this.createDeck();
        const hands = Array(this.numPlayers).fill().map(() => []);
        let currentPlayer = 0;
        while (deck.length > 0) {
            hands[currentPlayer].push(deck.pop());
            currentPlayer = (currentPlayer + 1) % this.numPlayers;
        }
        return hands;
    }

    checkForPairs(player) {
        const rankMap = {};
        let joker = null;
        player.hand.forEach(card => {
            if (card.isJoker) {
                joker = card;
            } else {
                const rank = card.value;
                if (!rankMap[rank]) rankMap[rank] = [];
                rankMap[rank].push(card);
            }
        });

        const newHand = [];
        for (const rank in rankMap) {
            const cards = rankMap[rank];
            while (cards.length >= 2) {
                const card1 = cards.pop();
                const card2 = cards.pop();
                player.pairs.push([card1, card2]);
            }
            newHand.push(...cards);
        }

        player.hand = newHand;
        if (joker) player.hand.push(joker);
        return player.pairs.length > 0;
    }

    shuffleHand(playerIndex) {
        const player = this.players[playerIndex];
        this.shuffleDeck(player.hand);
    }

    findNextPlayerWithCards(startIndex) {
        let targetIndex = startIndex;
        let attempts = 0;
        while (attempts < this.players.length) {
            targetIndex = (targetIndex + 1) % this.players.length;
            if (targetIndex === this.currentPlayer) break;
            if (this.players[targetIndex].hand.length > 0) {
                return targetIndex;
            }
            attempts++;
        }
        return -1;
    }

    pickCard(playerIndex, cardIndex, socketOrIo) {
        const currentPlayer = this.players[this.currentPlayer];
        const targetPlayer = this.players[playerIndex];
        if (!currentPlayer.isActive || targetPlayer.hand.length === 0 || cardIndex < 0 || cardIndex >= targetPlayer.hand.length) {
            socketOrIo.emit('error', { message: 'Invalid move!' });
            return false;
        }
        const selectablePlayerIndex = this.findNextPlayerWithCards(this.currentPlayer);
        if (selectablePlayerIndex !== playerIndex) {
            socketOrIo.emit('error', { message: `Must pick from Player ${selectablePlayerIndex}!` });
            return false;
        }

        const card = targetPlayer.hand.splice(cardIndex, 1)[0];
        currentPlayer.hand.push(card);
        const pairMade = this.checkForPairs(currentPlayer);
        if (pairMade) {
            socketOrIo.to(this.tableId).emit('pairMade', { playerId: currentPlayer.id });
        }

        if (targetPlayer.hand.length === 0) {
            socketOrIo.to(targetPlayer.id).emit('playerOut', { playerId: targetPlayer.id });
        }
        if (currentPlayer.hand.length === 0) {
            socketOrIo.to(currentPlayer.id).emit('playerOut', { playerId: currentPlayer.id });
        }

        if (this.checkGameOver()) {
            return true;
        }
        this.nextPlayer();
        return true;
    }

    nextPlayer() {
        this.players[this.currentPlayer].isActive = false;
        let nextPlayerIndex = this.currentPlayer;
        let attempts = 0;
        do {
            nextPlayerIndex = (nextPlayerIndex + 1) % this.players.length;
            attempts++;
        } while (this.players[nextPlayerIndex].hand.length === 0 && attempts < this.players.length);

        let playersWithCards = 0;
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].hand.length > 0) {
                playersWithCards++;
            }
        }
        if (playersWithCards <= 1) {
            this.checkGameOver();
            return;
        }

        this.currentPlayer = nextPlayerIndex;
        this.players[this.currentPlayer].isActive = true;
    }

    checkGameOver() {
        let playersWithCards = 0;
        let lastPlayerWithCards = -1;
        let jokerFound = false;
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].hand.length > 0) {
                playersWithCards++;
                lastPlayerWithCards = i;
                if (this.players[i].hand.some(card => card.isJoker)) jokerFound = true;
            }
        }
        if (!jokerFound) {
            return false;
        }
        if (playersWithCards === 1) {
            const lastPlayer = this.players[lastPlayerWithCards];
            if (lastPlayer.hand.some(card => card.isJoker)) {
                this.gameOver = true;
                this.loser = lastPlayerWithCards;
                for (let i = 0; i < this.players.length; i++) {
                    this.players[i].isLoser = (i === lastPlayerWithCards);
                    if (i !== lastPlayerWithCards) {
                        this.winner = i;
                        break;
                    }
                }
                return true;
            }
        }
        return false;
    }

    startGame() {
        const hands = this.dealCards();
        this.players.forEach((player, i) => {
            player.hand = hands[i];
            this.checkForPairs(player);
        });
        let minCards = 999;
        let firstPlayer = 0;
        for (let i = 0; i < this.numPlayers; i++) {
            if (this.players[i].hand.length < minCards) {
                minCards = this.players[i].hand.length;
                firstPlayer = i;
            }
        }
        this.currentPlayer = firstPlayer;
        this.players[this.currentPlayer].isActive = true;
    }

    getState() {
        return {
            players: this.players,
            currentPlayer: this.currentPlayer,
            gameOver: this.gameOver,
            winner: this.winner,
            loser: this.loser
        };
    }
}

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    socket.on('joinGame', ({ numPlayers, playerName }, callback) => {
        if (!numPlayers || ![3, 4].includes(numPlayers) || typeof playerName !== 'string') {
            callback({ success: false, error: 'Invalid input' });
            return;
        }
        const name = playerName && playerName.trim() ? playerName.trim() : `Guest${Math.floor(Math.random() * 1000)}`;
        
        let table = tables.find(t => t.status === 'waiting' && t.numPlayers === numPlayers && t.players.length < numPlayers);
        if (!table) {
            table = {
                id: `TABLE${tables.length + 1}`,
                players: [],
                status: 'waiting',
                gameManager: null,
                numPlayers: numPlayers,
                timer: null
            };
            tables.push(table);
            table.timer = setTimeout(() => {
                if (table.status !== 'waiting') return;
                while (table.players.length < table.numPlayers) {
                    const botId = `BOT${Date.now()}${table.players.length}`;
                    const bot = new BotPlayer(botId, table.players.length, table.numPlayers);
                    table.players.push(bot);
                    socket.to(table.id).emit('playerJoined', table.players);
                    console.log(`${bot.name} joined table ${table.id} as bot`);
                }
                table.status = 'playing';
                table.gameManager = new GameManager(table.id, table.numPlayers, table.players);
                table.gameManager.startGame();
                io.to(table.id).emit('gameStarted', table.numPlayers, table.players, table.gameManager.getState());
                console.log(`Game started in table ${table.id} with ${table.numPlayers} players: ${table.players.map(p => p.name).join(', ')}`);
            }, 10000);
        }

        const position = table.players.length;
        const player = { id: socket.id, name, position, isHuman: true };
        table.players.push(player);
        socket.join(table.id);
        io.to(table.id).emit('playerJoined', table.players);
        callback({ success: true, position, tableId: table.id });

        console.log(`${socket.id} joined table ${table.id} as ${name} (Lobby: ${numPlayers} players)`);

        if (table.players.length === table.numPlayers) {
            clearTimeout(table.timer);
            table.status = 'playing';
            table.gameManager = new GameManager(table.id, table.numPlayers, table.players);
            table.gameManager.startGame();
            io.to(table.id).emit('gameStarted', table.numPlayers, table.players, table.gameManager.getState());
            console.log(`Game started in table ${table.id} with ${table.numPlayers} players: ${table.players.map(p => p.name).join(', ')}`);
        }
    });

    socket.on('playerAction', (tableId, action) => {
        if (!tableId || !action || typeof action !== 'object') {
            socket.emit('error', { message: 'Invalid action' });
            return;
        }
        const table = tables.find(t => t.id === tableId);
        if (!table || !table.gameManager) {
            socket.emit('error', { message: 'Table not found' });
            return;
        }
        const playerIndex = table.players.findIndex(p => p.id === socket.id);
        if (playerIndex === -1 || playerIndex !== table.gameManager.currentPlayer) {
            socket.emit('error', { message: 'Not your turn' });
            return;
        }

        if (action.type === 'pickCard') {
            if (typeof action.playerIndex !== 'number' || typeof action.cardIndex !== 'number') {
                socket.emit('error', { message: 'Invalid pick' });
                return;
            }
            const success = table.gameManager.pickCard(action.playerIndex, action.cardIndex, io);
            if (success) {
                io.to(tableId).emit('gameStateUpdated', table.gameManager.getState());
                const nextPlayer = table.players[table.gameManager.currentPlayer];
                if (!nextPlayer.isHuman) {
                    nextPlayer.takeTurn(table.gameManager, io, tableId);
                }
            }
        } else if (action.type === 'shuffleHand') {
            table.gameManager.shuffleHand(playerIndex);
            io.to(tableId).emit('gameStateUpdated', table.gameManager.getState());
        } else {
            socket.emit('error', { message: 'Unknown action' });
        }
    });

    socket.on('playerOut', (data) => {
        if (!data || !data.playerId) return;
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
                    clearTimeout(table.timer);
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