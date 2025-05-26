/**
 * JackAss Card Game - Enhanced Version - PART 1
 * Modern ES6+ implementation with improved performance and maintainability
 */

// ===== CONSTANTS & CONFIGURATION =====
const GAME_CONFIG = {
  SUITS: ['♠', '♥', '♦', '♣'],
  CARD_VALUES: Array.from({length: 13}, (_, i) => i + 1).filter(v => v !== 11), // 1-13 except Jack (11)
  BOT_NAMES: ['CardBot 3000', 'ShuffleTron', 'JokerBuster X'],
  PLAYER_COUNT: 4,
  ANIMATION_DELAYS: {
    CARD_PICK: 1000,
    BOT_TURN: 2000,
    CARD_REVEAL: 500
  },
  AUDIO: {
    PLAYER_TURN: 'player-turn',
    MATCH_MADE: 'match-made',
    WIN_JINGLE: 'win-jingle',
    LOSING_SOUND: 'losing-sound-effect'
  }
};

const GAME_STATES = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  GAME_OVER: 'game_over'
};

// ===== UTILITY FUNCTIONS =====
const GameUtils = {
  /**
   * Fisher-Yates shuffle algorithm
   */
  shuffle(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },

  /**
   * Safe localStorage operations
   */
  saveToStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
      return false;
    }
  },

  loadFromStorage(key, defaultValue = {}) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
      console.warn('Failed to load from localStorage:', error);
      return defaultValue;
    }
  },

  /**
   * Debounce function to prevent rapid clicks
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Safe DOM manipulation
   */
  safeQuerySelector(selector) {
    const element = document.querySelector(selector);
    if (!element) {
      console.warn(`Element not found: ${selector}`);
    }
    return element;
  },

  /**
   * Create element with attributes and content
   */
  createElement(tag, attributes = {}, content = '') {
    const element = document.createElement(tag);
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'dataset') {
        Object.entries(value).forEach(([dataKey, dataValue]) => {
          element.dataset[dataKey] = dataValue;
        });
      } else {
        element.setAttribute(key, value);
      }
    });
    if (content) {
      element.innerHTML = content;
    }
    return element;
  }
};

// ===== CARD CLASS =====
class Card {
  constructor(value, suit) {
    this.value = value;
    this.suit = suit;
    this.isJoker = value === 'JOKER';
    
    // Cache display properties for performance
    this._displayValue = this._calculateDisplayValue();
    this._color = this._calculateColor();
  }

  _calculateDisplayValue() {
    if (this.isJoker) return 'JOKER';
    if (this.value === 1) return 'A';
    if (this.value === 13) return 'K';
    if (this.value === 12) return 'Q';
    return this.value.toString();
  }

  _calculateColor() {
    return (this.suit === '♥' || this.suit === '♦' || this.isJoker) ? 'red' : 'black';
  }

  get displayValue() {
    return this._displayValue;
  }

  get color() {
    return this._color;
  }

  matches(otherCard) {
    if (this.isJoker || otherCard.isJoker) return false;
    return this.value === otherCard.value;
  }

  equals(otherCard) {
    return this.value === otherCard.value && this.suit === otherCard.suit;
  }

  toJSON() {
    return {
      value: this.value,
      suit: this.suit,
      isJoker: this.isJoker
    };
  }
}

// ===== PLAYER CLASSES =====
class Player {
  constructor(id, name, isBot = false) {
    this.id = id;
    this.name = name;
    this.isBot = isBot;
    this.hand = [];
    this.pairs = [];
    this.isActive = false;
    this.isLoser = false;
  }

  addCard(card) {
    this.hand.push(card);
  }

  removeCard(index) {
    if (index >= 0 && index < this.hand.length) {
      return this.hand.splice(index, 1)[0];
    }
    return null;
  }

  hasCards() {
    return this.hand.length > 0;
  }

  hasJoker() {
    return this.hand.some(card => card.isJoker);
  }

  shuffleHand() {
    this.hand = GameUtils.shuffle(this.hand);
  }

  reset() {
    this.hand = [];
    this.pairs = [];
    this.isActive = false;
    this.isLoser = false;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      isBot: this.isBot,
      handCount: this.hand.length,
      pairCount: this.pairs.length,
      isActive: this.isActive,
      isLoser: this.isLoser
    };
  }
}

class BotPlayer extends Player {
  constructor(id, name) {
    super(id, name, true);
    this.difficulty = 'normal'; // Future: easy, normal, hard
  }

  async takeTurn(game) {
    if (!this.isActive) return;

    const targetIndex = game.findNextPlayerWithCards(game.currentPlayer);
    if (targetIndex === -1) {
      game.nextPlayer();
      return;
    }

    // Add some "thinking" time for better UX
    await this._simulateThinking();
    
    const targetPlayer = game.players[targetIndex];
    
    // Future enhancement: Smart card selection based on difficulty
    const cardIndex = this._selectCard(targetPlayer);
    
    game.selectCard(targetIndex, cardIndex, this.id);
  }

  async _simulateThinking() {
    const thinkingTime = Math.random() * 1000 + GAME_CONFIG.ANIMATION_DELAYS.BOT_TURN;
    return new Promise(resolve => setTimeout(resolve, thinkingTime));
  }

  _selectCard(targetPlayer) {
    // Simple random selection - can be enhanced with AI logic
    return Math.floor(Math.random() * targetPlayer.hand.length);
  }
}

// ===== GAME STATE MANAGER =====
class GameStateManager {
  constructor() {
    this.state = GAME_STATES.WAITING;
    this.listeners = new Map();
  }

  setState(newState, data = null) {
    const oldState = this.state;
    this.state = newState;
    this.notifyListeners(newState, oldState, data);
  }

  addListener(state, callback) {
    if (!this.listeners.has(state)) {
      this.listeners.set(state, []);
    }
    this.listeners.get(state).push(callback);
  }

  removeListener(state, callback) {
    if (this.listeners.has(state)) {
      const callbacks = this.listeners.get(state);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  notifyListeners(newState, oldState, data) {
    if (this.listeners.has(newState)) {
      this.listeners.get(newState).forEach(callback => {
        try {
          callback(newState, oldState, data);
        } catch (error) {
          console.error('State listener error:', error);
        }
      });
    }
  }
}

// ===== AUDIO MANAGER =====
class AudioManager {
  constructor() {
    this.enabled = true;
    this.volume = 0.7;
  }

  async playSound(soundId) {
    if (!this.enabled) return;

    try {
      const audio = GameUtils.safeQuerySelector(`#${soundId}`);
      if (audio) {
        audio.currentTime = 0;
        audio.volume = this.volume;
        await audio.play();
      }
    } catch (error) {
      // Audio play failed - this is common and expected in many browsers
      console.log(`Audio play failed for ${soundId}:`, error.message);
    }
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}

// ===== STATS MANAGER =====
class StatsManager {
  constructor() {
    this.storageKey = 'jackassStats';
    this.defaultStats = {
      wins: 0,
      losses: 0,
      games: 0,
      longestWinStreak: 0,
      currentStreak: 0,
      lastPlayed: null
    };
  }

  getStats() {
    return GameUtils.loadFromStorage(this.storageKey, this.defaultStats);
  }

  saveGame(won) {
    const stats = this.getStats();
    stats.games++;
    stats.lastPlayed = new Date().toISOString();

    if (won) {
      stats.wins++;
      stats.currentStreak++;
      stats.longestWinStreak = Math.max(stats.longestWinStreak, stats.currentStreak);
    } else {
      stats.losses++;
      stats.currentStreak = 0;
    }

    GameUtils.saveToStorage(this.storageKey, stats);
    return stats;
  }

  resetStats() {
    GameUtils.saveToStorage(this.storageKey, this.defaultStats);
    return this.defaultStats;
  }

  getWinRate() {
    const stats = this.getStats();
    return stats.games > 0 ? Math.round((stats.wins / stats.games) * 100) : 0;
  }
}

/**
 * JackAss Card Game - Enhanced Version - PART 2
 * Main Game Class and Implementation
 */

// ===== MAIN GAME CLASS =====
class JackAssGame {
  constructor(containerId, playerName, pairLogCallback) {
    // Core properties
    this.containerId = containerId;
    this.humanPlayerName = playerName || 'You';
    this.showPairLog = pairLogCallback || (() => {});

    // Game state
    this.players = [];
    this.currentPlayer = 0;
    this.gameOver = false;
    this.winner = null;
    this.loser = -1;
    this.selectedCard = null;

    // Managers
    this.stateManager = new GameStateManager();
    this.audioManager = new AudioManager();
    this.statsManager = new StatsManager();

    // Event handling
    this.cardClickHandler = GameUtils.debounce(this._handleCardClick.bind(this), 200);
    this.boundEventHandlers = new Map();

    // Performance optimization
    this.renderScheduled = false;

    this._initializeEventListeners();
  }

  // ===== INITIALIZATION =====
  _initializeEventListeners() {
    this.stateManager.addListener(GAME_STATES.PLAYING, () => {
      this.scheduleRender();
    });

    this.stateManager.addListener(GAME_STATES.GAME_OVER, (state, oldState, data) => {
      this.endGame(data);
    });
  }

  // ===== GAME SETUP =====
  startGame() {
    try {
      this._resetGame();
      this._createPlayers();
      this._dealInitialCards();
      this._findFirstPlayer();
      
      this.stateManager.setState(GAME_STATES.PLAYING);
      this._startCurrentPlayerTurn();
      
      console.log('Game started successfully');
    } catch (error) {
      console.error('Failed to start game:', error);
      this._handleGameError('Failed to start game');
    }
  }

  _resetGame() {
    this.players = [];
    this.currentPlayer = 0;
    this.gameOver = false;
    this.winner = null;
    this.loser = -1;
    this.selectedCard = null;
    this.stateManager.setState(GAME_STATES.WAITING);
  }

  _createPlayers() {
    // Create human player
    const humanPlayer = new Player('human', this.humanPlayerName, false);
    this.players.push(humanPlayer);

    // Create bot players
    GAME_CONFIG.BOT_NAMES.forEach((name, index) => {
      const bot = new BotPlayer(`bot${index}`, name);
      this.players.push(bot);
    });
  }

  _dealInitialCards() {
    const hands = this._dealCards();
    this.players.forEach((player, index) => {
      player.hand = hands[index];
      this._checkForPairs(player);
    });
  }

  _findFirstPlayer() {
    let minCards = Infinity;
    let firstPlayer = 0;

    this.players.forEach((player, index) => {
      if (player.hand.length < minCards) {
        minCards = player.hand.length;
        firstPlayer = index;
      }
    });

    this.currentPlayer = firstPlayer;
    this.players[firstPlayer].isActive = true;
  }

  // ===== DECK MANAGEMENT =====
  _createDeck() {
    const deck = [];
    
    // Add regular cards
    GAME_CONFIG.SUITS.forEach(suit => {
      GAME_CONFIG.CARD_VALUES.forEach(value => {
        deck.push(new Card(value, suit));
      });
    });

    // Add joker
    deck.push(new Card('JOKER', null));

    return GameUtils.shuffle(deck);
  }

  _dealCards() {
    const deck = this._createDeck();
    const hands = Array(GAME_CONFIG.PLAYER_COUNT).fill().map(() => []);
    
    let currentPlayerIndex = 0;
    while (deck.length > 0) {
      hands[currentPlayerIndex].push(deck.pop());
      currentPlayerIndex = (currentPlayerIndex + 1) % GAME_CONFIG.PLAYER_COUNT;
    }

    return hands;
  }

  // ===== PAIR CHECKING =====
  _checkForPairs(player) {
    const rankMap = new Map();
    let joker = null;

    // Organize cards by rank
    player.hand.forEach(card => {
      if (card.isJoker) {
        joker = card;
      } else {
        const rank = card.value;
        if (!rankMap.has(rank)) {
          rankMap.set(rank, []);
        }
        rankMap.get(rank).push(card);
      }
    });

    // Extract pairs
    const newHand = [];
    let pairsFormed = 0;

    rankMap.forEach((cards, rank) => {
      while (cards.length >= 2) {
        const card1 = cards.pop();
        const card2 = cards.pop();
        player.pairs.push([card1, card2]);
        pairsFormed++;

        // Log pair formation for human player
        if (player.id === 'human') {
          this.showPairLog(`Formed pair: ${card1.displayValue}s`);
        }
      }
      newHand.push(...cards);
    });

    // Rebuild hand
    player.hand = newHand;
    if (joker) {
      player.hand.push(joker);
    }

    // Play sound effect for human player pairs
    if (pairsFormed > 0 && player.id === 'human') {
      this.audioManager.playSound(GAME_CONFIG.AUDIO.MATCH_MADE);
    }

    return pairsFormed;
  }

  // ===== GAME FLOW =====
  async _startCurrentPlayerTurn() {
    const currentPlayer = this.players[this.currentPlayer];
    
    if (currentPlayer.isBot) {
      await currentPlayer.takeTurn(this);
    } else {
      this.audioManager.playSound(GAME_CONFIG.AUDIO.PLAYER_TURN);
    }
  }

  // This replaces the old humanSelectCard method
  selectCard(playerIndex, cardIndex, actorId) {
    try {
      if (!this._validateMove(playerIndex, cardIndex, actorId)) {
        return false;
      }

      const currentPlayer = this.players[this.currentPlayer];
      const targetPlayer = this.players[playerIndex];
      const card = targetPlayer.removeCard(cardIndex);

      if (!card) {
        console.error('Failed to remove card');
        return false;
      }

      if (actorId === 'human') {
        this._handleHumanCardSelection(card, currentPlayer, targetPlayer);
      } else {
        this._handleBotCardSelection(card, currentPlayer, targetPlayer);
      }

      return true;
    } catch (error) {
      console.error('Error in selectCard:', error);
      return false;
    }
  }

  // Legacy compatibility method
  humanSelectCard(playerIndex, cardIndex, actorId) {
    return this.selectCard(playerIndex, cardIndex, actorId);
  }

  _validateMove(playerIndex, cardIndex, actorId) {
    const currentPlayer = this.players[this.currentPlayer];
    const targetPlayer = this.players[playerIndex];

    // Check if it's the current player's turn
    if (!currentPlayer.isActive) {
      console.log('Not current player\'s turn');
      return false;
    }

    // Check if target player has cards
    if (!targetPlayer.hasCards()) {
      console.log('Target player has no cards');
      return false;
    }

    // Check card index bounds
    if (cardIndex < 0 || cardIndex >= targetPlayer.hand.length) {
      console.log('Invalid card index');
      return false;
    }

    // Check if selecting from correct player
    const selectablePlayerIndex = this.findNextPlayerWithCards(this.currentPlayer);
    if (selectablePlayerIndex !== playerIndex) {
      if (actorId === 'human') {
        const selectablePlayer = this.players[selectablePlayerIndex];
        this._showToast(`Must pick from ${selectablePlayer.name}!`);
      }
      return false;
    }

    return true;
  }

  async _handleHumanCardSelection(card, currentPlayer, targetPlayer) {
    // Show picked card animation
    await this._showPickedCardAnimation(card);
    
    // Add card to current player's hand
    currentPlayer.addCard(card);
    this._checkForPairs(currentPlayer);

    // Check win condition for human player
    if (currentPlayer.id === 'human' && !currentPlayer.hasCards()) {
      this._handleHumanWin();
      return;
    }

    // Check if target player is out of cards
    if (!targetPlayer.hasCards()) {
      if (this._checkGameOver()) return;
    }

    if (!this.gameOver) {
      this.nextPlayer();
    }
  }

  async _handleBotCardSelection(card, currentPlayer, targetPlayer) {
    // Add delay for bot turn
    await new Promise(resolve => 
      setTimeout(resolve, GAME_CONFIG.ANIMATION_DELAYS.BOT_TURN)
    );

    currentPlayer.addCard(card);
    this._checkForPairs(currentPlayer);

    if (!targetPlayer.hasCards()) {
      if (this._checkGameOver()) return;
    }

    if (!this.gameOver) {
      this.nextPlayer();
    }
  }

  _handleHumanWin() {
    this.gameOver = true;
    this.loser = -1; // No loser, human wins by being out of cards
    this.winner = this.players.findIndex(p => p.id === 'human');
    
    this.stateManager.setState(GAME_STATES.GAME_OVER, {
      type: 'human_win_cards',
      winner: this.winner,
      loser: this.loser
    });
  }

  async _showPickedCardAnimation(card) {
    return new Promise(resolve => {
      const pickedCardDiv = GameUtils.createElement('div', {
        className: 'picked-card'
      }, `
        <div class="card picked">
          <div class="card-face">
            <div class="card-value ${card.color}">${card.displayValue}</div>
            ${!card.isJoker ? `<div class="card-suit ${card.color}">${card.suit}</div>` : ''}
          </div>
        </div>
      `);

      const gameBoard = GameUtils.safeQuerySelector('#game-board');
      if (gameBoard) {
        gameBoard.appendChild(pickedCardDiv);

        setTimeout(() => {
          pickedCardDiv.remove();
          resolve();
        }, GAME_CONFIG.ANIMATION_DELAYS.CARD_PICK);
      } else {
        resolve();
      }
    });
  }

  nextPlayer() {
    this.players[this.currentPlayer].isActive = false;
    
    const nextPlayerIndex = this._findNextActivePlayer();
    if (nextPlayerIndex === -1) {
      this._checkGameOver();
      return;
    }

    this.currentPlayer = nextPlayerIndex;
    this.players[this.currentPlayer].isActive = true;
    
    this.scheduleRender();
    this._startCurrentPlayerTurn();
  }

  _findNextActivePlayer() {
    let nextPlayerIndex = this.currentPlayer;
    let attempts = 0;

    do {
      nextPlayerIndex = (nextPlayerIndex + 1) % this.players.length;
      attempts++;
    } while (!this.players[nextPlayerIndex].hasCards() && attempts < this.players.length);

    // Check if we found a valid player
    const playersWithCards = this.players.filter(p => p.hasCards()).length;
    return playersWithCards <= 1 ? -1 : nextPlayerIndex;
  }

  findNextPlayerWithCards(startIndex) {
    let targetIndex = startIndex;
    let attempts = 0;

    while (attempts < this.players.length) {
      targetIndex = (targetIndex + 1) % this.players.length;
      if (targetIndex === this.currentPlayer) break;
      if (this.players[targetIndex].hasCards()) return targetIndex;
      attempts++;
    }

    return -1;
  }

  // ===== GAME END LOGIC =====
  _checkGameOver() {
    const playersWithCards = this.players.filter(p => p.hasCards());
    const jokerFound = playersWithCards.some(p => p.hasJoker());

    if (!jokerFound) {
      return false;
    }

    if (playersWithCards.length === 1) {
      const lastPlayer = playersWithCards[0];
      if (lastPlayer.hasJoker()) {
        this.gameOver = true;
        this.loser = this.players.indexOf(lastPlayer);
        
        // Find winner (anyone except the loser)
        this.winner = this.players.findIndex((p, index) => index !== this.loser);
        
        // Mark loser
        this.players[this.loser].isLoser = true;

        this.stateManager.setState(GAME_STATES.GAME_OVER, {
          type: 'joker_loser',
          winner: this.winner,
          loser: this.loser
        });

        return true;
      }
    }

    return false;
  }

  endGame(data = {}) {
    const { type, winner, loser } = data;
    
    // Determine if human won
    const humanWon = winner === this.players.findIndex(p => p.id === 'human');
    
    // Save statistics
    const stats = this.statsManager.saveGame(humanWon);
    
    // Show game over screen
    this._showGameOverScreen(type, winner, loser, stats);
    
    // Play appropriate sound
    const soundId = humanWon ? GAME_CONFIG.AUDIO.WIN_JINGLE : GAME_CONFIG.AUDIO.LOSING_SOUND;
    this.audioManager.playSound(soundId);

    // Call external end game callback if provided
    if (window.endGame && typeof window.endGame === 'function') {
      window.endGame();
    }
  }

  _showGameOverScreen(type, winner, loser, stats) {
    const gameOverScreen = GameUtils.safeQuerySelector('#game-over-screen');
    const resultText = GameUtils.safeQuerySelector('#game-result');
    const winnerText = GameUtils.safeQuerySelector('#winner-text');
    const statsText = GameUtils.safeQuerySelector('#stats-text');

    if (!gameOverScreen || !resultText || !winnerText || !statsText) {
      console.error('Game over screen elements not found');
      return;
    }

    // Set result text based on game outcome
    if (type === 'human_win_cards') {
      resultText.textContent = "You Win!";
      winnerText.textContent = "You're out of cards!";
    } else {
      const isLoser = this.players[loser].id === 'human';
      if (isLoser) {
        resultText.textContent = "You Lost!";
        winnerText.textContent = "You got stuck with the JackAss!";
      } else {
        resultText.textContent = "You Won!";
        winnerText.textContent = `${this.players[loser].name} got stuck with the JackAss!`;
      }
    }

    // Show statistics
    const winRate = this.statsManager.getWinRate();
    statsText.innerHTML = `
      <div>Stats - Wins: ${stats.wins}, Losses: ${stats.losses}, Games: ${stats.games}</div>
      <div>Win Rate: ${winRate}% | Current Streak: ${stats.currentStreak}</div>
    `;

    gameOverScreen.classList.remove('hidden');
  }

  // ===== UTILITY METHODS =====
  shuffleHand(playerIndex) {
    if (playerIndex >= 0 && playerIndex < this.players.length) {
      this.players[playerIndex].shuffleHand();
      this.scheduleRender();
    }
  }

  quitGame() {
    if (confirm('Are you sure you want to quit the current game?')) {
      window.location.reload();
    }
  }

  // Legacy compatibility - keep old method name
  playSound(soundId) {
    this.audioManager.playSound(soundId);
  }

  // ===== RENDERING =====
  scheduleRender() {
    if (!this.renderScheduled) {
      this.renderScheduled = true;
      requestAnimationFrame(() => {
        this.renderGame();
        this.renderScheduled = false;
      });
    }
  }

  renderGame() {
    const board = GameUtils.safeQuerySelector(`#${this.containerId}`);
    if (!board) {
      console.error(`Game container #${this.containerId} not found`);
      return;
    }

    // Clear and rebuild board
    board.innerHTML = '';

    const table = GameUtils.createElement('div', { className: 'table' });
    board.appendChild(table);

    this._renderPlayers(table);
    this._renderMessage(board);
    this._updateTurnIndicator();
    
    // Set up event listeners for human player
    if (this.players[this.currentPlayer].id === 'human' && !this.gameOver) {
      this._addCardSelectionListeners();
    }
  }

  _renderPlayers(table) {
    const humanPlayerIndex = this.players.findIndex(player => player.id === 'human');
    if (humanPlayerIndex === -1) return;

    // Create rotated player array for proper positioning
    const rotatedPlayers = [];
    for (let i = 0; i < this.players.length; i++) {
      const rotatedIndex = (humanPlayerIndex + i) % this.players.length;
      rotatedPlayers.push(this.players[rotatedIndex]);
    }

    const selectablePlayerIndex = this.players[this.currentPlayer].id === 'human' 
      ? this.findNextPlayerWithCards(this.currentPlayer) 
      : -1;

    rotatedPlayers.forEach((player, visualIndex) => {
      const container = this._createPlayerContainer(player, visualIndex, selectablePlayerIndex);
      table.appendChild(container);
    });
  }

  _createPlayerContainer(player, visualIndex, selectablePlayerIndex) {
    const logicalIndex = this.players.findIndex(p => p.id === player.id);
    const isSelectable = logicalIndex === selectablePlayerIndex;

    const container = GameUtils.createElement('div', {
      className: `player-position player-${visualIndex}`
    });

    const activeClass = player.isActive ? (player.isBot ? 'active bot-active' : 'active') : '';
    const loserClass = player.isLoser ? 'loser' : '';

    container.innerHTML = `
      <div class="player ${activeClass} ${loserClass}">
        <h3>${player.name}</h3>
        <div class="pair-count">Pairs: ${player.pairs.length}</div>
        <div class="card-count">Cards: ${player.hand.length}</div>
        <div class="player-cards">
          ${this._renderPlayerCards(player, logicalIndex, isSelectable)}
        </div>
        ${this._renderPlayerControls(player, logicalIndex)}
      </div>
    `;

    return container;
  }

  _renderPlayerCards(player, logicalIndex, isSelectable) {
    return player.hand.map((card, cardIndex) => {
      const selectableClass = isSelectable && !this.gameOver ? 'selectable' : '';
      const cardContent = (player.id === 'human' || player.isLoser) 
        ? this._renderCardFace(card)
        : '<div class="card-back">JackAss</div>';

      return `
        <div class="card card-${logicalIndex}-${cardIndex} ${selectableClass}" 
             data-player="${logicalIndex}" 
             data-index="${cardIndex}">
          ${cardContent}
        </div>
      `;
    }).join('');
  }

  _renderCardFace(card) {
    return `
      <div class="card-face">
        <div class="card-value ${card.color}">${card.displayValue}</div>
        ${!card.isJoker ? `<div class="card-suit ${card.color}">${card.suit}</div>` : ''}
      </div>
    `;
  }

  _renderPlayerControls(player, logicalIndex) {
    if (player.id === 'human' && !this.gameOver && player.hasCards()) {
      return `
        <button class="button shuffle-button" onclick="game.shuffleHand(${logicalIndex})">
          Shuffle Hand
        </button>
        <button class="button quit-button" onclick="game.quitGame()">
          Quit
        </button>
      `;
    }
    return '';
  }

  _renderMessage(board) {
    const messageDiv = GameUtils.createElement('div', {
      className: 'message',
      id: 'messageArea'
    });

    if (this.players[this.currentPlayer].id === 'human') {
      const nextPlayerIndex = this.findNextPlayerWithCards(this.currentPlayer);
      const pickFromName = nextPlayerIndex !== -1 
        ? this.players[nextPlayerIndex].name 
        : 'no one (all other players are out of cards)';
      messageDiv.textContent = `Your turn! Select a card from ${pickFromName}.`;
    } else {
      messageDiv.textContent = `${this.players[this.currentPlayer].name}'s turn...`;
    }

    board.appendChild(messageDiv);
  }

  _updateTurnIndicator() {
    const turnIndicator = GameUtils.safeQuerySelector('#current-turn');
    if (turnIndicator) {
      turnIndicator.textContent = this.players[this.currentPlayer].name;
    }
  }

  // ===== EVENT HANDLING =====
  _addCardSelectionListeners() {
    const selectablePlayerIndex = this.findNextPlayerWithCards(this.currentPlayer);
    if (selectablePlayerIndex === -1) return;

    const cards = document.querySelectorAll('.card.selectable');
    
    cards.forEach(cardElement => {
      // Remove existing listener if present
      if (cardElement.clickHandler) {
        cardElement.removeEventListener('click', cardElement.clickHandler);
      }

      // Create new handler
      cardElement.clickHandler = (event) => {
        event.preventDefault();
        this._handleCardClick(cardElement);
      };

      // Add event listeners for multiple interaction types
      cardElement.addEventListener('click', cardElement.clickHandler);
      cardElement.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          this._handleCardClick(cardElement);
        }
      });

      // Make cards focusable for accessibility
      cardElement.setAttribute('tabindex', '0');
      cardElement.setAttribute('role', 'button');
      cardElement.setAttribute('aria-label', `Select card ${parseInt(cardElement.dataset.index) + 1}`);
    });
  }

  // Legacy compatibility - keep old method name
  addCardSelectionListeners() {
    this._addCardSelectionListeners();
  }

  _handleCardClick(cardElement) {
    const playerIndex = parseInt(cardElement.getAttribute('data-player'));
    const cardIndex = parseInt(cardElement.getAttribute('data-index'));
    const cardKey = `${playerIndex}-${cardIndex}`;

    // Handle double-click selection pattern
    if (this.selectedCard && this.selectedCard.key === cardKey) {
      // Second click - execute selection
      this.selectCard(playerIndex, cardIndex, 'human');
      this._clearCardSelection();
    } else {
      // First click - pre-select card
      this._setCardSelection(cardKey, cardElement);
    }
  }

  _setCardSelection(cardKey, cardElement) {
    // Clear previous selection
    this._clearCardSelection();

    // Set new selection
    this.selectedCard = { key: cardKey, element: cardElement };
    cardElement.classList.add('pre-selected');
    
    // Add visual feedback
    cardElement.setAttribute('aria-pressed', 'true');
  }

  _clearCardSelection() {
    if (this.selectedCard) {
      this.selectedCard.element.classList.remove('pre-selected');
      this.selectedCard.element.setAttribute('aria-pressed', 'false');
      this.selectedCard = null;
    }
  }

  // ===== UTILITY METHODS =====
  _showToast(message, duration = 3000) {
    // Create or get existing toast
    let toast = GameUtils.safeQuerySelector('.toast');
    if (!toast) {
      toast = GameUtils.createElement('div', { className: 'toast' });
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.remove('hidden');

    // Auto-hide toast
    setTimeout(() => {
      toast.classList.add('hidden');
    }, duration);
  }

  _handleGameError(message) {
    console.error('Game Error:', message);
    this._showToast(message, 5000);
  }

  // ===== PUBLIC API =====
  getGameState() {
    return {
      players: this.players.map(p => p.toJSON()),
      currentPlayer: this.currentPlayer,
      gameOver: this.gameOver,
      winner: this.winner,
      loser: this.loser,
      state: this.stateManager.state
    };
  }

  getStats() {
    return this.statsManager.getStats();
  }

  resetStats() {
    return this.statsManager.resetStats();
  }

  toggleAudio() {
    return this.audioManager.toggle();
  }

  setAudioVolume(volume) {
    this.audioManager.setVolume(volume);
  }

  // ===== CLEANUP =====
  destroy() {
    // Clear any pending timeouts/intervals
    this._clearCardSelection();
    
    // Remove event listeners
    this.boundEventHandlers.forEach((handler, element) => {
      element.removeEventListener('click', handler);
    });
    this.boundEventHandlers.clear();

    // Clear state
    this._resetGame();
    
    console.log('Game instance destroyed');
  }
}

// ===== LEGACY COMPATIBILITY =====
function saveStats(won) {
  console.warn('saveStats function is deprecated. Use game.statsManager.saveGame() instead.');
  if (window.game && window.game.statsManager) {
    return window.game.statsManager.saveGame(won);
  }
}

// Legacy compatibility - expose old method names on window
if (typeof window !== 'undefined') {
  window.showToast = function(message) {
    if (window.game && window.game._showToast) {
      window.game._showToast(message);
    } else {
      console.log('Toast:', message);
    }
  };
}

// ===== GLOBAL EXPORTS =====
window.JackAssGame = JackAssGame;
window.GameUtils = GameUtils;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { JackAssGame, GameUtils, Card, Player, BotPlayer };
}