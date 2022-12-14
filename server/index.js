require('dotenv').config();

const express = require('express');
const app = express();
const fs = require('fs-extra');
const cors = require('cors');

app.use(cors());
// const server = require('http').Server(app);

const https = require('https');
const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/jpoupinet.com/privkey.pem', 'utf8'),
  cert: fs.readFileSync('/etc/letsencrypt/live/jpoupinet.com/cert.pem', 'utf8'),
  ca: fs.readFileSync('/etc/letsencrypt/live/jpoupinet.com/chain.pem', 'utf8')
};
const server = https.Server(options, app);

const io = require('socket.io')(server);
server.listen(process.env.PORT);

app.get('/', (req, res) => res.send('Dessin Sensé API'));

const mod = (n, m) => ((n % m) + m) % m;

const getGameData = (idGame, archive = false) => {
  try {
    const path = archive ? `archives/${idGame}.json` : `games/${idGame}.json`;
    return JSON.parse(fs.readFileSync(path, 'utf-8'));
  } catch (e) {
    console.error(e);
    return null;
  }
};

const writeGameData = (idGame, data, archive = false) => {
  try {
    const path = archive ? `archives/${idGame}-${Date.now()}.json` : `games/${idGame}.json`;
    fs.outputFileSync(path, JSON.stringify(data), 'utf-8');
  } catch (e) {
    console.error(e);
  }
};

app.get('/archives', (req, res) => {
  try {
    const games = JSON.stringify(fs.readdirSync('archives/'));
    res.send(games);
  } catch (e) {
    console.error(e);
    return null;
  }
});

app.get('/archives/:gameName', (req, res) => {
  res.send(JSON.stringify(getGameData(req.params.gameName, true)));
});

const checkPlayersOnline = players =>
  players && players.filter(p => !p.online).length === 0;

io.on('connection', socket => {
  socket.on('connectToRoom', data => {
    socket.join(data.idGame);

    if (!fs.existsSync('games/' + data.idGame + '.json')) {
      writeGameData(data.idGame, {
        id: data.idGame,
        players: [],
        gameState: {
          started: false,
          finished: false,
          round: 0,
          sequences: [],
          timerStart: null,
          currentSequence: null
        },
        options: {
          timer: false,
          timerDuration: 180
        },
      });
    }

    let gameData = getGameData(data.idGame);

    socket.playerId = data.userToken.id;
    socket.playerName = data.userToken.name;

    if (
      gameData.gameState.started &&
      gameData.players.findIndex(p => p.id === data.userToken.id) === -1
    ) {
      socket.emit('roomAlreadyExists');
      return;
    }

    socket.idGame = data.idGame;

    let playerIndex = gameData.players.findIndex(p =>
      p.id === data.userToken.id
    );

    if (playerIndex === -1) {
      gameData.players.push({
        id: data.userToken.id,
        name: data.userToken.name,
        online: true,
        master: false,
        timeDiff: Date.now() - data.connectTime
      });
      
      playerIndex = gameData.players.findIndex(p =>
        p.id === data.userToken.id
      );
      
      if (playerIndex === 0) gameData.players[playerIndex].master = true;
    } else {
      gameData.players[playerIndex].online = true;
      gameData.players[playerIndex].name = data.userToken.name;
      gameData.players[playerIndex].timeDiff = Date.now() - data.connectTime;
    }

    writeGameData(data.idGame, gameData);

    io.sockets.in(data.idGame).emit('gameStateChange', gameData);
  });

  socket.on('changeOptionsTimer', timer => {
    if (!socket.idGame) return;
    let gameData = getGameData(socket.idGame);

    gameData.options.timer = timer;
    writeGameData(socket.idGame, gameData);
  });

  socket.on('changeOptionsTimerDuration', timerDuration => {
    if (!socket.idGame) return;
    let gameData = getGameData(socket.idGame);

    gameData.options.timerDuration = timerDuration;
    writeGameData(socket.idGame, gameData);
  });

  socket.on('startGame', () => {
    if (!socket.idGame) return;
    let gameData = getGameData(socket.idGame);

    if (!gameData.players.find(p => p.id === socket.playerId).master) return;

    if (gameData.players.filter(p => p.online).length < 3) return;

    gameData.players = gameData.players.filter(p => p.online);

    gameData.gameState.sequences = gameData.players.map(p => ({
      playerId: p.id,
      playerName: p.name,
      sequence: []
    }));

    gameData.gameState.started = true;
    gameData.gameState.finished = false;
    gameData.gameState.currentSequence = null;
    gameData.gameState.round = 1;

    writeGameData(socket.idGame, gameData);
    io.sockets.in(socket.idGame).emit('gameStateChange', gameData);
  });

  socket.on('submitCard', card => {
    if (!socket.idGame) return;
    let gameData = getGameData(socket.idGame);

    if (!checkPlayersOnline(gameData.players)) return;

    const round = gameData.gameState.round;
    const playerIndex = gameData.players.findIndex(p => p.id === socket.playerId);

    const indexSequence = round === 1 ?
      gameData.gameState.sequences.findIndex(seq => seq.playerId === socket.playerId)
      :
      mod(playerIndex - (round - 1), gameData.players.length);

    if (indexSequence === -1) return;

    if (gameData.gameState.sequences[indexSequence].sequence
      .findIndex(s => s.submitterId === socket.playerId) !== -1) return;

    gameData.gameState.sequences[indexSequence].sequence.push({
      submitterId: socket.playerId,
      submitterName: socket.playerName,
      type: round % 2 === 0 ? 'dessin' : 'texte',
      value: card
    });

    if (gameData.gameState.sequences.every(seq => seq.sequence.length === round)) {
      if (
        gameData.gameState.sequences.every(seq => seq.sequence.length === gameData.players.length)
      ) {
        gameData.gameState.finished = true;
      } else {
        gameData.gameState.round += 1;
      }
    }

    writeGameData(socket.idGame, gameData);
    io.sockets.in(socket.idGame).emit('gameStateChange', gameData);
  });

  socket.on('setCurrentSequence', payload => {
    if (!socket.idGame) return;
    let gameData = getGameData(socket.idGame);

    if (!checkPlayersOnline(gameData.players)) return;
    if (!gameData.players.find(p => p.id === socket.playerId).master) return;

    let currentSequence = null;

    if (payload.seqPlayerId && payload.nbCardsToShow) {
      const sequenceRequested =
        gameData.gameState.sequences.find(seq => seq.playerId === payload.seqPlayerId);

      if (payload.nbCardsToShow >= sequenceRequested.length) return;

      currentSequence = {
        sequence: sequenceRequested,
        nbCardsToShow: payload.nbCardsToShow
      };
    }

    gameData.gameState.currentSequence = currentSequence;

    writeGameData(socket.idGame, gameData);
    io.sockets.in(socket.idGame).emit('gameStateChange', gameData);
  });

  socket.on('archiveCurrentGame', () => {
    if (!socket.idGame) return;
    const gameData = getGameData(socket.idGame);
    if (!gameData.players.find(p => p.id === socket.playerId).master) return;

    writeGameData(socket.idGame, gameData, true);
  });

  socket.on('userReconnect', () => {
    if (!socket.idGame) return;

    let gameData = getGameData(socket.idGame);
    const playerIndex = gameData.players.findIndex(player =>
      player.id === socket.playerId
    );
    
    if (playerIndex > -1) gameData.players[playerIndex].online = true;

    writeGameData(socket.idGame, gameData);
    io.sockets.in(socket.idGame).emit('gameStateChange', gameData);
  });

  socket.on('disconnect', () => {
    if (!socket.idGame) return;

    let gameData = getGameData(socket.idGame);
    const playerIndex = gameData.players.findIndex(player =>
      player.id === socket.playerId
    );
    
    if (playerIndex > -1) gameData.players[playerIndex].online = false;

    writeGameData(socket.idGame, gameData);
    io.sockets.in(socket.idGame).emit('gameStateChange', gameData);
  });
});
