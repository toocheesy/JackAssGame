# JackAss Multiplayer

A gritty, neon-lit multiplayer card game (inspired by "Old Maid") built with Node.js, Express, and Socket.IO. Avoid getting stuck with the Joker (aka the "JackAss" card) as you take turns forming pairs and picking cards in real-time. Play with friends or bots in your browser.

## 🎮 Features

- **Real-Time Multiplayer**: Play with 3 or 4 players using Socket.IO for seamless syncing.
- **Auto Lobby Fill**: Bots auto-fill empty seats after 10 seconds.
- **Smart Gameplay**:
  - Take turns picking a card from the player to your left.
  - Automatically form pairs and discard them.
  - Last one stuck with the Joker loses.
- **Animated, Responsive UI**:
  - Gritty dark theme with red/yellow/green neon accents.
  - Sound effects for turns, matches, wins/losses.
  - Pre-selection animations and clear turn indicators.
- **Stats Tracking**: Win/loss stats saved locally.
- **Feedback System**: Built-in feedback button (connects to Google Form).
- **Mobile-friendly**: Layout adjusts for smaller screens.

## 🚀 Live Demo

- [Render](https://jackassgame.onrender.com)
- [Vercel](https://jack-ass-game.vercel.app)

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, Socket.IO
- **Frontend**: HTML, CSS, JavaScript

## 📁 Project Structure

```
JackAssGame/
├── server.js               # Node/Express/Socket.IO server
├── public/
│   ├── index.html         # Game UI
│   ├── game.js            # Client-side game logic
│   ├── styles.css         # Game styling
│   ├── win-jingle.mp3     # Win sound
│   ├── losing-sound-effect.mp3  # Loss sound
│   ├── match-made.mp3     # Match sound
│   ├── player-turn.mp3    # Turn notification
│   ├── privacy.html       # Privacy policy
│   └── terms.html         # Terms of service
└── README.md              # You're reading it!
```

## 📦 Installation

### Prerequisites
- Node.js (v14+)
- npm (bundled with Node)
- Git

### Run Locally
```bash
git clone https://github.com/toocheesy/JackAssGame.git
cd JackAssGame
npm install
node server.js
```

Open `http://localhost:3000` in multiple tabs (3 or 4) to simulate a full game.

## 🕹️ How to Play

1. On the start screen, choose 3 or 4 players and enter your name (optional).
2. Click "Join Game" in each tab. Bots will fill in after 10 seconds if needed.
3. Cards are dealt, and pairs are auto-discarded.
4. On your turn:
   - Select a card from the player to your left.
   - Form a pair if possible — it’s auto-discarded.
   - Goal: Avoid holding the Joker at the end!
5. The game ends when only one player has the Joker.

## 🔊 Sound Effects

Sound effects used in this game are royalty-free or Creative Commons licensed:

- **Card Pick Sound**: [Videvo](https://www.videvo.net/sound-effect/card-pick-up-wes101701/236368/)
- **Match Made Sound**: [Mixkit](https://mixkit.co/free-sound-effects/bonus/)
- **Game Win Jingle**: [Freesoundslibrary](https://www.freesoundslibrary.com/win-sound/)
- **Game Loss Sound**: [Freesoundslibrary](https://www.freesoundslibrary.com/losing-sound-effect/)
- **Turn Notification**: [Videvo](https://www.videvo.net/sound-effect/game-notification-132406/237129/)

## 📊 Stats

- View win/loss record from the Stats button.
- Data is stored locally in your browser (via `localStorage`).

## 📬 Feedback

Have thoughts or ideas? Click the "Feedback" button on the site header to submit suggestions via Google Form.

## 📜 License
MIT — see LICENSE file.

## 🙏 Acknowledgments

- Built with Grok and ChatGPT for development support.
- Inspired by the classic "Old Maid" card game.
- Designed for quick fun, adult humor, and digital chaos.
