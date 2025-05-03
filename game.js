class Card {
    constructor(value, suit) {
        this.value = value;
        this.suit = suit;
        this.isJoker = false;
    }
    static createJoker() {
        const joker = new Card('Joker', null);
        joker.isJoker = true;
        return joker;
    }
    getDisplayValue() {
        if (this.isJoker) return 'JOKER';
        if (this.value === 1) return 'A';
        if (this.value === 13) return 'K';
        if (this.value === 12) return 'Q';
        return this.value.toString();
    }
    getDisplaySuit() {
        if (this.isJoker) return null;
        const suitSymbols = {
            'spades': '♠',
            'hearts': '♥',
            'diamonds': '♦',
            'clubs': '♣'
        };
        return suitSymbols[this.suit];
    }
    isRed() {
        return this.suit === 'hearts' || this.suit === 'diamonds' || this.isJoker;
    }
    matches(card) {
        if (this.isJoker || card.isJoker) return false;
        return this.value === card.value;
    }
    getCardFaceHTML() {
        if (this.isJoker) {
            return `
                <div class="joker-face">
                    JOKER<br>The JackAss
                </div>
            `;
        }
        const valueClass = this.isRed() ? 'card-value red' : 'card-value';
        const suitStyle = this.isRed() ? 'style="color: red;"' : '';
        return `
            <div class="card-face">
                <div class="${valueClass}">${this.getDisplayValue()}</div>
                <div class="card-suit" ${suitStyle}>${this.getDisplaySuit()}</div>
                <div class="card-center">
                    <div class="card-suit" ${suitStyle}>${this.getDisplaySuit()}</div>
                </div>
                <div class="card-suit" ${suitStyle} style="align-self: flex-end;">${this.getDisplaySuit()}</div>
                <div class="${valueClass}" style="align-self: flex-end;">${this.getDisplayValue()}</div>
            </div>
        `;
    }
}

class Deck {
    constructor() {
        this.cards = [];
        this.initializeDeck();
    }
    initializeDeck() {
        const suits = ['spades', 'hearts', 'diamonds', 'clubs'];
        const values = Array.from({length: 13}, (_, i) => i + 1);
        for (const suit of suits) {
            for (const value of values) {
                if (value !== 11) {
                    this.cards.push(new Card(value, suit));
                }
            }
        }
        this.cards.push(Card.createJoker());
        this.shuffle();
    }
    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }
    dealCards(numPlayers) {
        const hands = Array(numPlayers).fill().map(() => []);
        let currentPlayer = 0;
        while (this.cards.length > 0) {
            hands[currentPlayer].push(this.cards.pop());
            currentPlayer = (currentPlayer + 1) % numPlayers;
        }
        return hands;
    }
}

class Player {
    constructor(id, name, isHuman = false) {
        this.id = id;
        this.name = name;
        this.hand = [];
        this.pairs = [];
        this.isHuman = isHuman;
        this.isActive = false;
    }
    addCard(card) {
        this.hand.push(card);
        this.shuffleHand();
    }
    removeCard(index) {
        if (index >= 0 && index < this.hand.length) {
            return this.hand.splice(index, 1)[0];
        }
        return null;
    }
    shuffleHand() {
        for (let i = this.hand.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.hand[i], this.hand[j]] = [this.hand[j], this.hand[i]];
        }
    }
    checkAndPutDownPairs() {
        const pairsFound = [];
        for (let i = 0; i < this.hand.length; i++) {
            for (let j = i + 1; j < this.hand.length; j++) {
                if (this.hand[i].matches(this.hand[j])) {
                    pairsFound.push([i, j]);
                }
            }
        }
        pairsFound.sort((a, b) => b[0] - a[0]);
        for (const [i, j] of pairsFound) {
            const highIndex = Math.max(i, j);
            const lowIndex = Math.min(i, j);
            const card2 = this.hand.splice(highIndex, 1)[0];
            const card1 = this.hand.splice(lowIndex, 1)[0];
            this.pairs.push([card1, card2]);
        }
        return pairsFound.length;
    }
    hasJoker() {
        return this.hand.some(card => card.isJoker);
    }
    getHandSize() {
        return this.hand.length;
    }
    renderUI(containerId, showCards = false) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const activeClass = this.isActive ? 'active' : '';
        let html = `
            <div class="player ${activeClass}">
                <div class="player-name">${this.name}</div>
                <div class="player-cards">
        `;
        for (let i = 0; i < this.hand.length; i++) {
            const card = this.hand[i];
            html += `<div class="card" data-index="${i}">`;
            if (showCards || this.isHuman) {
                html += card.getCardFaceHTML();
            } else {
                html += `<div class="card-back"></div>`;
            }
            html += `</div>`;
        }
        html += `</div><div class="pairs-container">`;
        console.log(`${this.name}'s pairs:`, this.pairs);
        for (const pair of this.pairs) {
            if (!pair || !Array.isArray(pair)) continue;
            html += `<div class="pair">`;
            for (const card of pair) {
                if (!card || typeof card.getCardFaceHTML !== 'function') {
                    console.log('Invalid card in pair:', card);
                    continue;
                }
                html += `<div class="card">${card.getCardFaceHTML()}</div>`;
            }
            html += `</div>`;
        }
        html += `</div></div>`;
        container.innerHTML = html;
    }
}

class JackAssGame {
    constructor(containerId) {
        this.containerId = containerId;
        this.players = [];
        this.currentPlayerIndex = 0;
        this.gameOver = false;
        this.messageContainer = document.getElementById('messageArea');
        this.winner = null;
    }
    newGame(numPlayers = 4) {
        this.players = [];
        this.gameOver = false;
        this.winner = null;
        this.players.push(new Player(0, 'You', true));
        for (let i = 1; i < numPlayers; i++) {
            this.players.push(new Player(i, `Player ${i + 1}`));
        }
        const deck = new Deck();
        const hands = deck.dealCards(numPlayers);
        for (let i = 0; i < numPlayers; i++) {
            this.players[i].hand = hands[i];
            this.players[i].checkAndPutDownPairs();
        }
        let minCards = Number.MAX_SAFE_INTEGER;
        let startingPlayerIndex = 0;
        for (let i = 0; i < this.players.length; i++) {
            const handSize = this.players[i].getHandSize();
            if (handSize < minCards) {
                minCards = handSize;
                startingPlayerIndex = i;
            }
        }
        this.currentPlayerIndex = startingPlayerIndex;
        this.players[this.currentPlayerIndex].isActive = true;
        this.renderGame();
        if (!this.players[this.currentPlayerIndex].isHuman) {
            this.makeAIMove();
        }
    }
    renderGame() {
        this.players[0].renderUI('humanPlayerArea', true);
        const aiPlayersHtml = this.players.slice(1).map((player, index) => {
            const containerId = `aiPlayer${index}`;
            const container = document.createElement('div');
            container.id = containerId;
            return container;
        });
        const aiArea = document.getElementById('opponentsArea');
        aiArea.innerHTML = '';
        aiPlayersHtml.forEach(el => aiArea.appendChild(el));
        for (let i = 1; i < this.players.length; i++) {
            this.players[i].renderUI(`aiPlayer${i-1}`, false);
        }
        this.updateMessage();
        if (this.players[this.currentPlayerIndex].isHuman && !this.gameOver) {
            this.addCardSelectionListeners();
        }
    }
    addCardSelectionListeners() {
        const aiPlayers = this.players.slice(1);
        for (let i = 0; i < aiPlayers.length; i++) {
            const cards = document.querySelectorAll(`#aiPlayer${i} .card`);
            cards.forEach(cardElement => {
                cardElement.addEventListener('click', () => {
                    const playerIndex = i + 1;
                    const cardIndex = parseInt(cardElement.getAttribute('data-index'));
                    this.humanSelectCard(playerIndex, cardIndex);
                });
            });
        }
    }
    humanSelectCard(playerIndex, cardIndex) {
        if (this.gameOver || !this.players[this.currentPlayerIndex].isHuman) {
            return;
        }
        const humanPlayer = this.players[0];
        const selectedPlayer = this.players[playerIndex];
        const selectedCard = selectedPlayer.removeCard(cardIndex);
        if (!selectedCard) return;
        humanPlayer.addCard(selectedCard);
        humanPlayer.checkAndPutDownPairs();
        if (this.checkGameOver()) {
            this.renderGame();
            return;
        }
        this.nextPlayer();
        this.renderGame();
        if (!this.players[this.currentPlayerIndex].isHuman) {
            setTimeout(() => this.makeAIMove(), 1000);
        }
    }
    makeAIMove() {
        if (this.gameOver || this.players[this.currentPlayerIndex].isHuman) {
            return;
        }
        const aiPlayer = this.players[this.currentPlayerIndex];
        let targetPlayerIndex;
        do {
            targetPlayerIndex = Math.floor(Math.random() * this.players.length);
        } while (targetPlayerIndex === this.currentPlayerIndex || this.players[targetPlayerIndex].hand.length === 0);
        const targetPlayer = this.players[targetPlayerIndex];
        const randomCardIndex = Math.floor(Math.random() * targetPlayer.hand.length);
        const selectedCard = targetPlayer.removeCard(randomCardIndex);
        aiPlayer.addCard(selectedCard);
        aiPlayer.checkAndPutDownPairs();
        if (this.checkGameOver()) {
            this.renderGame();
            return;
        }
        this.nextPlayer();
        this.renderGame();
        if (!this.players[this.currentPlayerIndex].isHuman) {
            setTimeout(() => this.makeAIMove(), 1000);
        }
    }
    nextPlayer() {
        this.players[this.currentPlayerIndex].isActive = false;
        let nextPlayerIndex = this.currentPlayerIndex;
        do {
            nextPlayerIndex = (nextPlayerIndex + 1) % this.players.length;
        } while (this.players[nextPlayerIndex].hand.length === 0 && nextPlayerIndex !== this.currentPlayerIndex);
        this.currentPlayerIndex = nextPlayerIndex;
        this.players[this.currentPlayerIndex].isActive = true;
    }
    checkGameOver() {
        let playersWithCards = 0;
        let lastPlayerWithCards = -1;
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].hand.length > 0) {
                playersWithCards++;
                lastPlayerWithCards = i;
            }
        }
        if (playersWithCards === 1) {
            this.gameOver = true;
            for (let i = 0; i < this.players.length; i++) {
                if (i !== lastPlayerWithCards) {
                    this.winner = i;
                    break;
                }
            }
            return true;
        }
        return false;
    }
    updateMessage() {
        if (!this.messageContainer) return;
        let message = '';
        if (this.gameOver) {
            if (this.winner === 0) {
                message = 'Congratulations! You win! 🎉';
            } else {
                message = `Game over! Player ${this.winner + 1} wins! You lost.`;
            }
            message += '<br><button id="restartGameBtn">Play Again</button>';
        } else {
            const currentPlayer = this.players[this.currentPlayerIndex];
            if (currentPlayer.isHuman) {
                message = 'Your turn! Select a card from another player.';
            } else {
                message = `${currentPlayer.name}'s turn...`;
            }
        }
        this.messageContainer.innerHTML = message;
        if (this.gameOver) {
            document.getElementById('restartGameBtn').addEventListener('click', () => {
                this.newGame(this.players.length);
            });
        }
    }
}