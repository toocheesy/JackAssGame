JackAss Multiplayer

A web-based, multiplayer card game for 3 or 4 players, built with Node.js, Express, and Socket.IO. JackAss brings the classic card game (also known as "Old Maid") into a gritty, neon-lit digital experience. Avoid getting stuck with the Joker (the "JackAss" card) as you take turns picking cards and forming pairs in real-time with friends!

Features

Real-Time Multiplayer: Play with 3 or 4 players across different browser tabs, with seamless game state syncing using Socket.IO.
Dynamic Lobby: Select the number of players (3 or 4) and join a game—starts automatically when the table fills.
Intuitive Gameplay:
Players take turns picking cards from the player to their left.
Form pairs to discard cards, aiming to avoid the Joker.
The last player with the Joker loses, and others win!

Gritty Design: Charcoal background with neon accents (reds, yellows, dark greens), featuring animated cards and a chaotic vibe.
Stats Tracking: Win/loss stats are saved locally, with a stats screen showing your game history and win rate.
Responsive UI: Double-click to pick cards, with visual feedback like pre-selection animations and turn indicators.

Prerequisites
To run JackAss Multiplayer locally, you’ll need:

Node.js (version 14 or higher recommended)
npm (comes with Node.js)
Git (to clone the repository)

Installation

Clone the Repository:
git clone [https://github.com/toocheesy/JackAssGame.git](https://github.com/toocheesy/JackAssGame.git)
cd JackAssGame

Install Dependencies:
npm install

This installs the required Node.js packages (express, socket.io).

Run the Server:
node server.js

The server will start on [http://localhost:3000](http://localhost:3000) (or another port if specified).

Play the Game:

Open multiple browser tabs (3 or 4, depending on the number of players).
Navigate to [http://localhost:3000](http://localhost:3000) in each tab.
Select the number of players (3 or 4) and click "Join Game" in each tab.
The game starts when the table fills!

How to Play

Join a Game:

On the start screen, choose 3 or 4 players via the dropdown.
Click "Join Game" to join the lobby. The game starts when the table fills with the selected number of players.

Gameplay:

Cards are dealt, and matching pairs are automatically discarded.
On your turn, pick a card from the next available player to your left by double-clicking a card (click once to pre-select, again to confirm).
If you form a pair, it’s discarded. The goal is to avoid ending up with the Joker.
The game ends when one player is left with the Joker—they lose, and the others win.

Game Over:

A game-over screen shows whether you won or lost, with a message about who got stuck with the Joker.
Check your stats (via the "Stats" button) to see your win/loss record.
Click "Play Again" to restart.

Project Structure

server.js: Node.js server using Express and Socket.IO to manage game tables and sync game state.
public/:
index.html: The game UI, including the start screen, game board, and game-over screen.
game.js: Client-side game logic, including the JackAssGame and Card classes.
styles.css: CSS for the gritty, neon-themed design.

Screenshots

Start Screen: Select the number of players and join the game.
Game Board: See your hand, other players’ card backs, and take turns picking cards.
Game Over: Win or lose with a dramatic message!

Tech Stack

Backend: Node.js, Express, Socket.IO
Frontend: HTML, JavaScript, CSS
Real-Time Communication: Socket.IO for multiplayer syncing

Sound Effects

Sound effects used in this game are licensed under Creative Commons or similar royalty-free terms. Sources include:

* Card Pick Sound: “Card Pick Up” from [Videvo](https://www.videvo.net/sound-effect/card-pick-up-wes101701/236368/)
* Match Made Sound: “Bonus Win” from [Mixkit](https://mixkit.co/free-sound-effects/bonus/)
* Game Win Jingle: “Win Sound” from [Freesoundslibrary](https://www.freesoundslibrary.com/win-sound/)
* Game Loss Sound: “Losing Sound Effect” from [Freesoundslibrary](https://www.freesoundslibrary.com/losing-sound-effect/)
* Turn Start Ping: “Notification Sound” from [Videvo](https://www.videvo.net/sound-effect/game-notification-132406/237129/)

Contributing
Want to add features or fix bugs? Feel free to fork the repository, make your changes, and submit a pull request. Some ideas for contributions:

Add a chat system for in-game trash talk.
Include sound effects (e.g., card shuffles, win/lose jingles).
Support custom player names.

License
This project is licensed under the MIT License—see the LICENSE file for details.

Acknowledgments

Built with the help of Grok (xAI) for real-time debugging and development support.
Inspired by the classic card game "Old Maid" with a chaotic, modern twist.
