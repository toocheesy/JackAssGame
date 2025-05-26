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
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.hand = [];
        this.pairs = [];
        this.isActive = false;
        this.isLoser = false;
        this.isBot = true;
    }

    takeTurn(game) {
        if (!game.players.find(p => p.id === this.id).isActive) return;
        const targetIndex = game.findNextPlayerWithCards(game.currentPlayer);
        if (targetIndex === -1) {
            game.nextPlayer();
            return;
        }
        const targetPlayer = game.players[targetIndex];
        const cardIndex = Math.floor(Math.random() * targetPlayer.hand.length);
        setTimeout(() => {
            game.humanSelectCard(targetIndex, cardIndex, this.id);
        }, 2000);
    }
}

class JackAssGame {
    constructor(containerId, playerName, pairLogCallback) {
        this.containerId = containerId;
        this.players = [];
        this.currentPlayer = 0;
        this.gameOver = false;
        this.winner = null;
        this.loser = -1;
        this.selectedCard = null;
        this.humanPlayerName = playerName;
        this.showPairLog = pairLogCallback || (() => {});
    }

    startGame() {
        this.players = [];
        this.gameOver = false;
        this.winner = null;
        this.loser = -1;

        const humanPlayer = {
            id: 'human',
            name: this.humanPlayerName,
            hand: [],
            pairs: [],
            isActive: false,
            isLoser: false,
            isBot: false
        };
        this.players.push(humanPlayer);
        const botNames = ['CardBot 3000', 'ShuffleTron', 'JokerBuster X'];
        for (let i = 0; i < 3; i++) {
            const bot = new BotPlayer(`bot${i}`, botNames[i]);
            this.players.push(bot);
        }

        const hands = this.dealCards();
        this.players.forEach((player, i) => {
            player.hand = hands[i];
            this.checkForPairs(player);
        });

        let minCards = 999;
        let firstPlayer = 0;
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].hand.length < minCards) {
                minCards = this.players[i].hand.length;
                firstPlayer = i;
            }
        }

        this.currentPlayer = firstPlayer;
        this.players[this.currentPlayer].isActive = true;
        this.renderGame();
        if (this.players[this.currentPlayer].isBot) {
            this.players[this.currentPlayer].takeTurn(this);
        }
        this.playSound('player-turn');
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
        const hands = Array(4).fill().map(() => []);
        let currentPlayer = 0;
        while (deck.length > 0) {
            hands[currentPlayer].push(deck.pop());
            currentPlayer = (currentPlayer + 1) % 4;
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
                // Add pair logging for human player
                if (player.id === 'human') {
                    this.showPairLog(`Formed pair: ${card1.getDisplayValue()}s`);
                }
            }
            newHand.push(...cards);
        }

        player.hand = newHand;
        if (joker) player.hand.push(joker);
        if (player.pairs.length > 0 && player.id === 'human') {
            this.playSound('match-made');
        }
    }

    shuffleHand(playerIndex) {
        const player = this.players[playerIndex];
        this.shuffleDeck(player.hand);
        this.renderGame();
    }

    findNextPlayerWithCards(startIndex) {
        let targetIndex = startIndex;
        let attempts = 0;
        while (attempts < this.players.length) {
            targetIndex = (targetIndex + 1) % this.players.length;
            if (targetIndex === this.currentPlayer) break;
            if (this.players[targetIndex].hand.length > 0) return targetIndex;
            attempts++;
        }
        return -1;
    }

    playSound(soundId) {
        const audio = document.getElementById(soundId);
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(err => console.log(`Sound play error: ${err}`));
        }
    }

    humanSelectCard(playerIndex, cardIndex, actorId) {
        console.log('DEBUG: humanSelectCard called');
        console.log('DEBUG: playerIndex:', playerIndex, 'cardIndex:', cardIndex, 'actorId:', actorId);
        
        const currentPlayer = this.players[this.currentPlayer];
        const targetPlayer = this.players[playerIndex];
        
        console.log('DEBUG: currentPlayer:', currentPlayer.name, 'isActive:', currentPlayer.isActive);
        console.log('DEBUG: targetPlayer:', targetPlayer.name, 'hand length:', targetPlayer.hand.length);
        
        if (!currentPlayer.isActive || targetPlayer.hand.length === 0 || cardIndex < 0 || cardIndex >= targetPlayer.hand.length) {
            console.log('DEBUG: Invalid move detected!');
            console.log('DEBUG: currentPlayer.isActive:', currentPlayer.isActive);
            console.log('DEBUG: targetPlayer.hand.length:', targetPlayer.hand.length);
            console.log('DEBUG: cardIndex:', cardIndex, 'valid range: 0 to', targetPlayer.hand.length - 1);
            return;
        }
        
        const selectablePlayerIndex = this.findNextPlayerWithCards(this.currentPlayer);
        console.log('DEBUG: selectablePlayerIndex:', selectablePlayerIndex, 'playerIndex:', playerIndex);
        
        if (selectablePlayerIndex !== playerIndex) {
            console.log(`DEBUG: Must pick from Player ${selectablePlayerIndex}!`);
            if (actorId === 'human') {
                showToast(`Must pick from ${this.players[selectablePlayerIndex].name}!`);
            }
            return;
        }

        console.log('DEBUG: All checks passed, proceeding with card selection');
        const card = targetPlayer.hand.splice(cardIndex, 1)[0];
        
        if (actorId === 'human') {
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

                if (currentPlayer.id === 'human' && currentPlayer.hand.length === 0) {
                    this.gameOver = true;
                    this.loser = -1; // No loser, human wins by being out of cards
                    this.winner = this.players.findIndex(p => p.id === 'human');
                    this.renderGame();
                    this.endGame();
                    return;
                }
                if (targetPlayer.hand.length === 0) {
                    this.checkGameOver();
                }
                if (!this.gameOver) {
                    this.nextPlayer();
                }
            }, 1000);
        } else {
            // Bot turn: don't show the card, just transfer it
            setTimeout(() => {
                currentPlayer.hand.push(card);
                this.checkForPairs(currentPlayer);

                if (targetPlayer.hand.length === 0) {
                    this.checkGameOver();
                }
                if (!this.gameOver) {
                    this.nextPlayer();
                }
            }, 1000);
        }
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
        this.renderGame();
        if (this.players[this.currentPlayer].id === 'human') {
            this.playSound('player-turn');
        }
        if (this.players[this.currentPlayer].isBot) {
            this.players[this.currentPlayer].takeTurn(this);
        }
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
                this.renderGame();
                this.endGame();
                return true;
            }
        }
        return false;
    }

    renderGame() {
        const board = document.getElementById(this.containerId);
        if (!board) return;
        board.innerHTML = '';

        const table = document.createElement('div');
        table.className = 'table';
        board.appendChild(table);

        const localPlayerIndex = this.players.findIndex(player => player.id === 'human');
        if (localPlayerIndex === -1) return;

        const rotatedPlayers = [];
        for (let i = 0; i < this.players.length; i++) {
            const rotatedIndex = (localPlayerIndex + i) % this.players.length;
            rotatedPlayers.push(this.players[rotatedIndex]);
        }

        const selectablePlayerIndex = this.players[this.currentPlayer].id === 'human' ? this.findNextPlayerWithCards(this.currentPlayer) : -1;
        const pickFromPlayer = selectablePlayerIndex !== -1 ? this.players[selectablePlayerIndex] : null;

        rotatedPlayers.forEach((player, visualIndex) => {
            const container = document.createElement('div');
            container.className = `player-position player-${visualIndex}`;

            const logicalIndex = this.players.findIndex(p => p.id === player.id);
            const isSelectable = logicalIndex === selectablePlayerIndex;

            const activeClass = player.isActive ? 'active bot-active' : '';
            const loserClass = player.isLoser ? 'loser' : '';
            let html = `
                <div class="player ${activeClass} ${loserClass}">
                    <h3>${player.name}</h3>
                    <div class="pair-count">Pairs: ${player.pairs.length}</div>
                    <div class="card-count">Cards: ${player.hand.length}</div>
                    <div class="player-cards">
                        ${player.hand.map((card, cardIndex) => `
                            <div class="card card-${logicalIndex}-${cardIndex} ${isSelectable && !this.gameOver ? 'selectable' : ''}" data-player="${logicalIndex}" data-index="${cardIndex}">
                                ${player.id === 'human' || player.isLoser ? `
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
                    ${player.id === 'human' && !this.gameOver && player.hand.length > 0 ? `
                        <button class="button shuffle-button" onclick="game.shuffleHand(${logicalIndex})">Shuffle Hand</button>
                    ` : ''}
                </div>
            `;
            container.innerHTML = html;
            table.appendChild(container);
        });

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        messageDiv.id = 'messageArea';
        if (this.players[this.currentPlayer].id === 'human') {
            const pickFromName = pickFromPlayer ? pickFromPlayer.name : 'no one (all other players are out of cards)';
            messageDiv.textContent = `Your turn! Select a card from ${pickFromName}.`;
        } else {
            messageDiv.textContent = `${this.players[this.currentPlayer].name}'s turn...`;
        }
        board.appendChild(messageDiv);

        document.getElementById('current-turn').textContent = this.players[this.currentPlayer].name;
        if (this.players[this.currentPlayer].id === 'human' && !this.gameOver) {
            this.addCardSelectionListeners();
        }
    }

    addCardSelectionListeners() {
        const selectablePlayerIndex = this.findNextPlayerWithCards(this.currentPlayer);
        console.log('DEBUG: addCardSelectionListeners called');
        console.log('DEBUG: selectablePlayerIndex:', selectablePlayerIndex);
        console.log('DEBUG: currentPlayer:', this.currentPlayer);
        console.log('DEBUG: players with cards:', this.players.map((p, i) => ({index: i, name: p.name, cards: p.hand.length})));
        
        if (selectablePlayerIndex === -1) {
            console.log('DEBUG: No selectable player found, returning');
            return;
        }

        // Look for selectable cards in ANY player position, not just player-1
        const cards = document.querySelectorAll('.card.selectable');
        console.log('DEBUG: Found selectable cards:', cards.length);
        
        cards.forEach((cardElement, idx) => {
            console.log(`DEBUG: Setting up listener for card ${idx}:`, cardElement);
            cardElement.removeEventListener('click', cardElement.clickHandler);
            cardElement.clickHandler = () => {
                const playerIndex = parseInt(cardElement.getAttribute('data-player'));
                const cardIndex = parseInt(cardElement.getAttribute('data-index'));
                const cardKey = `${playerIndex}-${cardIndex}`;
                
                console.log('DEBUG: Card clicked!');
                console.log('DEBUG: playerIndex:', playerIndex, 'cardIndex:', cardIndex);
                console.log('DEBUG: selectablePlayerIndex:', selectablePlayerIndex);

                if (this.selectedCard && this.selectedCard.key === cardKey) {
                    console.log('DEBUG: Executing card selection');
                    this.humanSelectCard(playerIndex, cardIndex, 'human');
                    this.selectedCard.element.classList.remove('pre-selected');
                    this.selectedCard = null;
                } else {
                    console.log('DEBUG: Pre-selecting card');
                    if (this.selectedCard) {
                        this.selectedCard.element.classList.remove('pre-selected');
                    }
                    this.selectedCard = { key: cardKey, element: cardElement };
                    cardElement.classList.add('pre-selected');
                }
            };
            cardElement.addEventListener('click', cardElement.clickHandler);
        });
    }

    endGame() {
        const gameOverScreen = document.getElementById('game-over-screen');
        const resultText = document.getElementById('game-result');
        const winnerText = document.getElementById('winner-text');
        const statsText = document.getElementById('stats-text');
        if (this.loser === -1 && this.winner !== -1) {
            resultText.textContent = "You Win!";
            winnerText.textContent = "You're out of cards!";
            this.playSound('win-jingle');
        } else {
            const isLoser = this.players[this.loser].id === 'human';
            if (isLoser) {
                resultText.textContent = "You Lost!";
                winnerText.textContent = "You got stuck with the JackAss!";
                this.playSound('losing-sound-effect');
            } else {
                resultText.textContent = "You Won!";
                winnerText.textContent = `${this.players[this.loser].name} got stuck with the JackAss!`;
                this.playSound('win-jingle');
            }
        }
        const stats = JSON.parse(localStorage.getItem('jackassStats') || '{"wins":0,"losses":0,"games":0}');
        statsText.textContent = `Stats - Wins: ${stats.wins}, Losses: ${stats.losses}, Games: ${stats.games}`;
        gameOverScreen.classList.remove('hidden');
        saveStats(this.winner === this.players.findIndex(p => p.id === 'human'));
        // Removed automatic page reload - now controlled externally
    }
}

function saveStats(won) {
    let stats = JSON.parse(localStorage.getItem('jackassStats') || '{"wins":0,"losses":0,"games":0}');
    stats.games++;
    if (won) stats.wins++;
    else stats.losses++;
    localStorage.setItem('jackassStats', JSON.stringify(stats));
}

window.JackAssGame = JackAssGame;