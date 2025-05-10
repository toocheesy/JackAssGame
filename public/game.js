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

class JackAssGame {
    constructor(containerId, socket, tableId) {
        this.containerId = containerId;
        this.socket = socket;
        this.tableId = tableId;
        this.players = [];
        this.currentPlayer = 0;
        this.deck = [];
        this.gameOver = false;
        this.winner = null;
        this.loser = -1;
        this.selectedCard = null;
    }

    newGame(numPlayers, players) {
        console.log(`Initializing new game with ${numPlayers} players...`);
        this.players = [];
        this.gameOver = false;
        this.winner = null;
        this.loser = -1;

        const hands = this.dealCards(numPlayers);
        for (let i = 0; i < numPlayers; i++) {
            const playerInfo = players[i];
            const player = {
                id: playerInfo.id,
                name: playerInfo.name,
                hand: hands[i],
                pairs: [],
                isHuman: playerInfo.isHuman,
                isActive: false,
                isLoser: false
            };
            this.checkForPairs(player);
            this.players.push(player);
        }

        let minCards = 999;
        let firstPlayer = 0;
        for (let i = 0; i < numPlayers; i++) {
            if (this.players[i].hand.length < minCards) {
                minCards = this.players[i].hand.length;
                firstPlayer = i;
            }
        }

        this.currentPlayer = firstPlayer;
        this.players[this.currentPlayer].isActive = true;
        console.log(`Starting player: ${this.players[this.currentPlayer].name}`);
        this.syncGameState();
        this.renderGame();
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

    dealCards(numPlayers) {
        const deck = this.createDeck();
        const hands = Array(numPlayers).fill().map(() => []);
        let currentPlayer = 0;
        while (deck.length > 0) {
            hands[currentPlayer].push(deck.pop());
            currentPlayer = (currentPlayer + 1) % numPlayers;
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

        console.log(`${player.name}'s hand after pairing:`, player.hand.map(card => card.isJoker ? 'JOKER' : `${card.getDisplayValue()} of ${card.suit}`));
    }

    shuffleHand(playerIndex) {
        const player = this.players[playerIndex];
        if (!player.isHuman) return;
        this.shuffleDeck(player.hand);
        console.log(`${player.name} shuffled their hand:`, player.hand.map(card => card.isJoker ? 'JOKER' : `${card.getDisplayValue()} of ${card.suit}`));
        this.syncGameState();
        this.renderGame();
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

    syncGameState() {
        if (!this.tableId) {
            console.error('Table ID is not defined, cannot sync game state');
            return;
        }
        console.log(`Syncing game state for table ${this.tableId}...`);
        this.socket.emit('updateGameState', this.tableId, {
            players: this.players,
            currentPlayer: this.currentPlayer,
            gameOver: this.gameOver,
            winner: this.winner,
            loser: this.loser
        });
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
        // Render the game board first to show the final card exchange
        this.renderGame();
        // If the game is over, show the game-over screen for all players
        if (this.gameOver) {
            this.endGame();
        }
    }

    handlePlayerAction(action) {
        if (action.type === 'pickCard') {
            this.humanSelectCard(action.playerIndex, action.cardIndex);
        } else if (action.type === 'shuffleHand') {
            this.shuffleHand(action.playerIndex);
        }
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

        const selectablePlayerIndex = this.players[this.currentPlayer].id === this.socket.id ? this.findNextPlayerWithCards(this.currentPlayer) : -1;

        this.players.forEach((player, index) => {
            const containerId = index === 0 ? 'humanPlayerArea' : `aiPlayer${index-1}`;
            const container = document.createElement('div');
            container.id = containerId;
            container.className = `player-position player-${index}`;

            const activeClass = player.isActive ? 'active' : '';
            const loserClass = player.isLoser ? 'loser' : '';
            const isSelectable = index === selectablePlayerIndex;
            let html = `
                <div class="player ${activeClass} ${loserClass}">
                    <h3>${player.name}</h3>
                    <div class="pair-count">Pairs: ${player.pairs.length}</div>
                    <div class="player-cards">
                        ${player.hand.map((card, cardIndex) => `
                            <div class="card card-${index}-${cardIndex} ${isSelectable && !this.gameOver ? 'selectable' : ''}" data-player="${index}" data-index="${cardIndex}">
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
                    ${player.id === this.socket.id && !this.gameOver ? `
                        <button class="button shuffle-button" onclick="game.shuffleHand(${index})">Shuffle Hand</button>
                    ` : ''}
                </div>
            `;
            container.innerHTML = html;
            table.appendChild(container);
            console.log(`Rendered UI for ${player.name} in ${containerId}${isSelectable ? ' (selectable)' : ''}`);
        });

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        messageDiv.id = 'messageArea';
        messageDiv.textContent = this.players[this.currentPlayer].id === this.socket.id ?
            "Your turn! Select a card from the next available player to your left." :
            `${this.players[this.currentPlayer].name}'s turn...`;
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
            this.nextPlayer();
            this.renderGame();
            return;
        }
        const selectablePlayer = this.players[selectablePlayerIndex];
        const containerId = selectablePlayerIndex === 0 ? 'humanPlayerArea' : `aiPlayer${selectablePlayerIndex-1}`;
        const cards = document.querySelectorAll(`#${containerId} .card.selectable`);
        console.log(`Found ${cards.length} selectable cards for Player ${selectablePlayerIndex} to select from (hand length: ${selectablePlayer.hand.length})`);
        if (selectablePlayer.hand.length > 0) {
            cards.forEach(cardElement => {
                cardElement.removeEventListener('click', cardElement.clickHandler);
                cardElement.clickHandler = () => {
                    const playerIndex = parseInt(cardElement.getAttribute('data-player'));
                    const cardIndex = parseInt(cardElement.getAttribute('data-index'));
                    const cardKey = `${playerIndex}-${cardIndex}`;
                    
                    if (this.selectedCard && this.selectedCard.key === cardKey) {
                        console.log(`Confirmed selection: Player ${playerIndex}, Index ${cardIndex}`);
                        pickCard(playerIndex, cardIndex);
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
        } else {
            console.log(`No selectable cards for Player ${selectablePlayerIndex} (hand length: ${selectablePlayer.hand.length})`);
        }
    }

    humanSelectCard(playerIndex, cardIndex) {
        if (this.gameOver || this.players[this.currentPlayer].id !== this.socket.id) {
            console.log("Cannot pick card: game over or not this player's turn.");
            return;
        }
        const selectablePlayerIndex = this.findNextPlayerWithCards(this.currentPlayer);
        if (selectablePlayerIndex === -1 || playerIndex !== selectablePlayerIndex) {
            console.log(`Cannot pick from Player ${playerIndex}; must pick from Player ${selectablePlayerIndex} (next available to your left).`);
            return;
        }
        const targetPlayer = this.players[playerIndex];
        const currentPlayer = this.players.find(p => p.id === this.socket.id);
        const card = targetPlayer.hand.splice(cardIndex, 1)[0];

        const pickedCardDiv = document.createElement('div');
        pickedCardDiv.className = 'picked-card';
        pickedCardDiv.innerHTML = `
            <div class="card picked">
                <div class="card-face">
                    <div class="card-value ${card.getColor()}">${card.getDisplayValue()}</div>
                    ${!card.isJoker ? `<div class="card-suit ${card.getColor()}">${card.suit}</div>` : ''}
                </div>
            </div>
        `;
        document.getElementById('game-board').appendChild(pickedCardDiv);
        setTimeout(() => {
            pickedCardDiv.remove();
            currentPlayer.hand.push(card);
            this.checkForPairs(currentPlayer);
            // Sync the state after the card exchange, even if the game ends
            this.syncGameState();
            if (this.checkGameOver()) {
                // Sync the final state before ending the game
                this.syncGameState();
                return;
            }
            this.nextPlayer();
        }, 1000);
    }

    nextPlayer() {
        this.players[this.currentPlayer].isActive = false;
        let nextPlayerIndex = this.currentPlayer;
        let attempts = 0;
        do {
            nextPlayerIndex = (nextPlayerIndex + 1) % this.players.length;
            attempts++;
        } while (this.players[nextPlayerIndex].hand.length === 0 && attempts < this.players.length);
        if (this.players[nextPlayerIndex].hand.length === 0) {
            console.log("No players with cards to continue; game should end.");
            return;
        }
        this.currentPlayer = nextPlayerIndex;
        this.players[this.currentPlayer].isActive = true;
        console.log(`Next player: ${this.players[this.currentPlayer].name}`);
        this.syncGameState();
    }

    checkGameOver() {
        let playersWithCards = 0;
        let lastPlayerWithCards = -1;
        let totalCards = 0;
        let jokerFound = false;
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].hand.length > 0) {
                playersWithCards++;
                lastPlayerWithCards = i;
                totalCards += this.players[i].hand.length;
                if (this.players[i].hand.some(card => card.isJoker)) jokerFound = true;
            }
        }
        console.log(`Players with cards: ${playersWithCards}, Total cards left: ${totalCards}, Joker present: ${jokerFound}`);
        if (!jokerFound) {
            console.error("Game ended without the Joker in play!");
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

    endGame() {
        const gameOverScreen = document.getElementById('game-over-screen');
        const resultText = document.getElementById('game-result');
        const winnerText = document.getElementById('winner-text');
        if (this.loser === -1) {
            console.error("Game ended but no loser was set!");
            return;
        }
        // Determine if the current player (based on socket.id) is the loser
        const isLoser = this.players[this.loser].id === this.socket.id;
        if (isLoser) {
            resultText.textContent = "You Lost!";
            winnerText.textContent = "You got stuck with the JackAss!";
        } else {
            resultText.textContent = "You Won!";
            winnerText.textContent = `Player ${this.loser + 1} got stuck with the JackAss!`;
        }
        gameOverScreen.classList.remove('hidden');
        // Pass whether the current player won (not the loser) to saveStats
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