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
}

class JackAssGame {
    constructor(containerId, socket, tableId) {
        this.containerId = containerId;
        this.socket = socket;
        this.tableId = tableId;
        this.players = [];
        this.currentPlayer = 0;
        this.gameOver = false;
        this.winner = null;
        this.loser = -1;
        this.selectedCard = null;
        this.timerInterval = null;
    }

    init() {
        this.socket.on('playerJoined', (players) => {
            console.log('Player joined:', players);
            const startScreen = document.getElementById('start-screen');
            const waitingMessage = document.getElementById('waiting-message');
            if (waitingMessage) {
                waitingMessage.textContent = `Table Filling... (${players.length}/${players[0].numPlayers || 4} players)`;
                let timeLeft = 10;
                if (this.timerInterval) clearInterval(this.timerInterval);
                this.timerInterval = setInterval(() => {
                    timeLeft--;
                    waitingMessage.textContent = `Table Filling... (${players.length}/${players[0].numPlayers || 4} players, ${timeLeft}s)`;
                    if (timeLeft <= 0 || players.length === players[0].numPlayers) {
                        clearInterval(this.timerInterval);
                    }
                }, 1000);
            }
        });

        this.socket.on('gameStarted', (numPlayers, players, gameState) => {
            console.log(`Game started with ${numPlayers} players`);
            clearInterval(this.timerInterval);
            this.setGameState(gameState);
            this.playSound('player-turn');
        });

        this.socket.on('gameStateUpdated', (gameState) => {
            const prevPlayer = this.currentPlayer;
            this.setGameState(gameState);
            if (prevPlayer !== gameState.currentPlayer && this.players[gameState.currentPlayer].id === this.socket.id) {
                this.playSound('player-turn');
            }
        });

        this.socket.on('pairMade', (data) => {
            if (data.playerId === this.socket.id) {
                this.playSound('match-made');
            }
        });

        this.socket.on('playerOut', (data) => {
            if (data.playerId === this.socket.id) {
                window.location.reload();
            }
        });

        this.socket.on('playerLeft', (playerId) => {
            console.log(`Player ${playerId} left`);
            this.renderGame();
        });

        this.socket.on('error', (data) => {
            console.log(`Error: ${data.message}`);
            const messageDiv = document.getElementById('messageArea');
            if (messageDiv) {
                messageDiv.textContent = data.message;
                setTimeout(() => {
                    messageDiv.textContent = this.players[this.currentPlayer].id === this.socket.id
                        ? `Your turn! Select a card from ${this.players[this.findNextPlayerWithCards(this.currentPlayer)]?.name || 'no one'}.`
                        : `${this.players[this.currentPlayer].name}'s turn...`;
                }, 2000);
            }
        });
    }

    playSound(soundId) {
        const audio = document.getElementById(soundId);
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(err => console.log(`Sound play error: ${err}`));
        }
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

    setGameState(gameState) {
        this.players = gameState.players.map(player => ({
            ...player,
            hand: player.hand.map(card => Object.assign(new Card(card.value, card.suit), card))
        }));
        this.currentPlayer = gameState.currentPlayer;
        this.gameOver = gameState.gameOver;
        this.winner = gameState.winner;
        this.loser = gameState.loser;
        this.renderGame();
        if (this.gameOver) {
            this.endGame();
        }
    }

    handlePlayerAction(action) {
        this.socket.emit('playerAction', this.tableId, action);
    }

    shuffleHand(playerIndex) {
        this.handlePlayerAction({ type: 'shuffleHand', playerIndex });
    }

    renderGame() {
        console.log("Rendering game board...");
        const board = document.getElementById('game-board');
        if (!board) {
            console.error("Game board element not found!");
            return;
        }
        board.innerHTML = '';

        const table = document.createElement('div');
        table.className = 'table';
        board.appendChild(table);

        const localPlayerIndex = this.players.findIndex(player => player.id === this.socket.id);
        if (localPlayerIndex === -1) {
            console.error("Local player not found!");
            return;
        }

        const rotatedPlayers = [];
        for (let i = 0; i < this.players.length; i++) {
            const rotatedIndex = (localPlayerIndex + i) % this.players.length;
            rotatedPlayers.push(this.players[rotatedIndex]);
        }

        const selectablePlayerIndex = this.players[this.currentPlayer].id === this.socket.id ? this.findNextPlayerWithCards(this.currentPlayer) : -1;
        const pickFromPlayer = selectablePlayerIndex !== -1 ? this.players[selectablePlayerIndex] : null;

        rotatedPlayers.forEach((player, visualIndex) => {
            const container = document.createElement('div');
            container.className = `player-position player-${visualIndex}`;

            const logicalIndex = this.players.findIndex(p => p.id === player.id);
            const isSelectable = logicalIndex === selectablePlayerIndex && visualIndex === 1;

            const activeClass = player.isActive ? 'active' : '';
            const loserClass = player.isLoser ? 'loser' : '';
            let html = `
                <div class="player ${activeClass} ${loserClass}">
                    <h3>${player.name}</h3>
                    <div class="pair-count">Pairs: ${player.pairs.length}</div>
                    <div class="player-cards">
                        ${player.hand.map((card, cardIndex) => `
                            <div class="card card-${logicalIndex}-${cardIndex} ${isSelectable && !this.gameOver ? 'selectable' : ''}" data-player="${logicalIndex}" data-index="${cardIndex}">
                                ${player.id === this.socket.id || player.isLoser ? `
                                    <div class="card-face">
                                        <div class="card-value ${card.getColor()}">${card.getDisplayValue()}</div>
                                        ${!card.isJoker ? `<div class="card-suit ${card.getColor()}">${card.suit}</div>` : ''}
                                    </div>
                                ` : `
                                    <div class="card-back">JackAss</div>
                                `}
                            </div>
                        `).join('')}
                    </div>
                    ${player.id === this.socket.id && !this.gameOver && player.hand.length > 0 ? `
                        <button class="button shuffle-button" onclick="game.shuffleHand(${logicalIndex})">Shuffle Hand</button>
                    ` : ''}
                </div>
            `;
            container.innerHTML = html;
            table.appendChild(container);
            console.log(`Rendered UI for ${player.name} in position player-${visualIndex}${isSelectable ? ' (selectable)' : ''}`);
        });

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        messageDiv.id = 'messageArea';
        if (this.players[this.currentPlayer].id === this.socket.id) {
            const pickFromName = pickFromPlayer ? pickFromPlayer.name : 'no one (all other players are out of cards)';
            messageDiv.textContent = `Your turn! Select a card from ${pickFromName}.`;
        } else {
            messageDiv.textContent = `${this.players[this.currentPlayer].name}'s turn...`;
        }
        board.appendChild(messageDiv);

        document.getElementById('current-turn').textContent = this.players[this.currentPlayer].name;
        if (this.players[this.currentPlayer].id === this.socket.id && !this.gameOver) {
            this.addCardSelectionListeners();
        }
    }

    addCardSelectionListeners() {
        console.log("Adding card selection listeners...");
        const selectablePlayerIndex = this.findNextPlayerWithCards(this.currentPlayer);
        if (selectablePlayerIndex === -1) {
            console.log("No players with cards to select from; ending turn.");
            this.handlePlayerAction({ type: 'nextPlayer' });
            return;
        }
        const cards = document.querySelectorAll(`.player-1 .card.selectable`);
        console.log(`Found ${cards.length} selectable cards for Player ${selectablePlayerIndex}`);
        if (this.players[selectablePlayerIndex].hand.length > 0 && cards.length > 0) {
            cards.forEach(cardElement => {
                cardElement.removeEventListener('click', cardElement.clickHandler);
                cardElement.clickHandler = () => {
                    const playerIndex = parseInt(cardElement.getAttribute('data-player'));
                    const cardIndex = parseInt(cardElement.getAttribute('data-index'));
                    const cardKey = `${playerIndex}-${cardIndex}`;
                    
                    if (this.selectedCard && this.selectedCard.key === cardKey) {
                        console.log(`Confirmed selection: Player ${playerIndex}, Index ${cardIndex}`);
                        this.handlePlayerAction({ type: 'pickCard', playerIndex, cardIndex });
                        this.selectedCard.element.classList.remove('pre-selected');
                        this.selectedCard = null;
                    } else {
                        if (this.selectedCard) {
                            this.selectedCard.element.classList.remove('pre-selected');
                        }
                        this.selectedCard = { key: cardKey, element: cardElement };
                        cardElement.classList.add('pre-selected');
                        console.log(`Selected card: Player ${playerIndex}, Index ${cardIndex}`);
                    }
                };
                cardElement.addEventListener('click', cardElement.clickHandler);
            });
        }
    }

    endGame() {
        const gameOverScreen = document.getElementById('game-over-screen');
        const resultText = document.getElementById('game-result');
        const winnerText = document.getElementById('winner-text');
        if (this.loser === -1) {
            console.error("Game ended but no loser was set!");
            return;
        }
        const isLoser = this.players[this.loser].id === this.socket.id;
        if (isLoser) {
            resultText.textContent = "You Lost!";
            winnerText.textContent = "You got stuck with the JackAss!";
            this.playSound('losing-sound-effect');
        } else {
            resultText.textContent = "You Won!";
            winnerText.textContent = `${this.players[this.loser].name} got stuck with the JackAss!`;
            this.playSound('win-jingle');
        }
        gameOverScreen.classList.remove('hidden');
        saveStats(!isLoser);
    }
}

function saveStats(won) {
    let stats = JSON.parse(localStorage.getItem('jackassStats') || '{"wins":0,"losses":0,"games":0}');
    stats.games++;
    if (won) stats.wins++;
    else stats.losses++;
    localStorage.setItem('jackassStats', JSON.stringify(stats));
}