JackAss Card Game
A gritty, neon-lit single-player card game (inspired by "Old Maid") built with HTML, CSS, and JavaScript. Face off against three bots—CardBot 3000, ShuffleTron, and JokerBuster X—in a battle to avoid getting stuck with the Joker (aka the "JackAss" card). Form pairs, pick cards, and aim to be the first to run out of cards in this browser-based game!
🎮 Features

Single-Player Gameplay: Play against 3 bots in a seamless, client-side experience.
Smart Gameplay:
Take turns picking a card from the player to your left.
Automatically form pairs and discard them.
Win by being the first to run out of cards, or lose if you're the last one with the Joker.


Enhanced Game Flow:
Bots’ card picks are hidden for added mystery.
Invalid moves show a toast message (e.g., “Must pick from [Bot Name]!”).
Card counts displayed per player (e.g., “Cards: 5”).
Bot turns highlighted with a glowing effect.
Win condition: Run out of cards to win instantly, with auto-redirect to the join screen after 3 seconds.


Animated, Responsive UI:
Gritty dark theme with red/yellow/green neon accents.
Sound effects for turns, matches, wins/losses.
Pre-selection animations and clear turn indicators.
Game over screen with fade-in animation and stats display.


Stats Tracking: Win/loss stats saved locally in your browser.
Feedback System: Built-in feedback button (connects to Google Form, placeholder link).
Mobile-Friendly: Layout adjusts for smaller screens.

🚀 Live Demo

Vercel

🛠️ Tech Stack

Frontend: HTML, CSS, JavaScript

📁 Project Structure
JackAssGame/
├── public/
│   ├── index.html         # Game UI
│   ├── game.js            # Client-side game logic
│   ├── styles.css         # Game styling
│   ├── win-jingle.mp3     # Win sound
│   ├── losing-sound-effect.mp3  # Loss sound
│   ├── match-made.mp3     # Match sound
│   ├── player-turn.mp3    # Turn notification
│   ├── privacy.html       # Privacy policy (placeholder)
│   └── terms.html         # Terms of service (placeholder)
├── vercel.json            # Vercel deployment config
└── README.md              # You're reading it!

📦 Installation
Prerequisites

A modern web browser (e.g., Chrome, Firefox)

Run Locally
Since the game is client-side, you can run it directly in your browser:

Clone the repository:git clone https://github.com/toocheesy/JackAssGame.git
cd JackAssGame


Open public/index.html in your browser (e.g., drag and drop into Chrome, or use a local server like npx serve public).

🕹️ How to Play

On the start screen, enter your name (or leave blank for a guest name).
Click "Join Game" to start immediately against three bots: CardBot 3000, ShuffleTron, and JokerBuster X.
Cards are dealt, and pairs are auto-discarded:
52-card deck (4 suits, values 1–13 excluding Jacks, plus 1 Joker).
Each player gets 13 cards.


Take turns:
On your turn, pick a card from the player to your left (double-click: first to pre-select, second to confirm).
Form pairs if possible—they’re auto-discarded.
Bots pick automatically (2-second delay), but their cards are hidden.
Invalid moves show a toast message (e.g., “Must pick from [Bot Name]!”).


Win by running out of cards:
If you run out, you win immediately (“You Win! You’re out of cards!”) and return to the join screen after 3 seconds.
If a bot is the last with the Joker, you win (“BotX got stuck with the JackAss!”).
If you’re the last with the Joker, you lose (“You got stuck with the JackAss!”).


Stats update after each game (Wins, Losses, Games).

🔊 Sound Effects
Sound effects used in this game are royalty-free or Creative Commons licensed:

Card Pick Sound: Videvo
Match Made Sound: Mixkit
Game Win Jingle: Freesoundslibrary
Game Loss Sound: Freesoundslibrary
Turn Notification: Videvo

📊 Stats

View win/loss record from the Stats button or post-game screen.
Data is stored locally in your browser (via localStorage).

📬 Feedback
Have thoughts or ideas? Click the "Feedback" button on the site header to submit suggestions via Google Form (placeholder link).
📜 License
MIT — see LICENSE file.
🙏 Acknowledgments

Built with Grok for development support.
Inspired by the classic "Old Maid" card game.
Designed for quick fun, adult humor, and digital chaos.

