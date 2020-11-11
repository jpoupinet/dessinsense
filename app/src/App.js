import React, { useState, useContext, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  useParams,
  Redirect
} from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { v4 as uuidv4 } from 'uuid';
import { Stage, Layer, Line, Circle } from 'react-konva';

import Drawing from './Drawing';
import WebSocketProvider, { WebSocketContext } from './Websocket';
import createStore from './store';
import { updateGameData } from './actions';
import { API_URL } from './config';

import './App.css';

const mod = (n, m) => ((n % m) + m) % m;

const PlayerList = ({ players, idPlayer }) => {
  return (
    <div id="players">
      <p id="header">Liste des joueurs</p>
      {players.map(player => {
        if (player.id === idPlayer) {
          return (<p id="curPlayer" key={player.id}>{player.name}</p>);
        }

        return (
          <div
            key={player.id}
            className={player.online ? 'player' : 'player-offline'}
          >
            <p>{player.name}{!player.online && ' - Déconnecté(e)'}</p>
          </div>
        );
      })}
    </div >
  );
};

const Game = () => {
  const roomName = useParams().roomName;
  const idGame = useSelector(state => state.idGame);
  const userToken = useSelector(state => state.userToken);
  const gameData = useSelector(state => state.gameData);
  const [redirect, setRedirect] = useState('');

  const [gameInit, setGameInit] = useState(false);
  const [showPlayers, setShowPlayers] = useState(false);
  const [card, setCard] = useState('');

  const dispatch = useDispatch();
  const ws = useContext(WebSocketContext);

  if (!userToken || roomName === 'archives') {
    return (<div>{!idGame && <Redirect to={'/' + roomName} />}</div>);
  }

  if (roomName !== idGame && userToken) {
    dispatch(updateGameData(null));
    ws.wsConnectToRoom(roomName, userToken.id, userToken.name);
    return (<div></div>);
  }

  if (!gameInit) {
    ws.wsConnectToRoom(roomName, userToken.id, userToken.name);
    setGameInit(true);
    return (<div></div>);
  }

  if (!gameData) {
    return (<div></div>);
  }
  
  const curPlayer = gameData ? gameData.players.find(p => p.id === userToken.id) : null;
  const cardSubmitted = gameData.gameState.started ?
    gameData.gameState.sequences[
      mod(
        gameData.players.findIndex(p => p.id === userToken.id) -
        (gameData.gameState.round - 1),
        gameData.players.length
      )
    ].sequence.findIndex(seq => seq.submitterId === userToken.id) !== -1
    :
    null;

  const previousSequence = gameData && gameData.gameState.round > 1 ?
    gameData.gameState.sequences[
      mod(
        gameData.players.findIndex(p => p.id === userToken.id) -
        (gameData.gameState.round - 1),
        gameData.players.length
      )
    ] : null;

  const previousCard = gameData && gameData.gameState.round > 1 ?
    previousSequence.sequence[gameData.gameState.round - 2] : null;

  const handleTextCard = event => {
    setCard(event.target.value);
  };

  const handleSubmitTextCard = event => {
    event.preventDefault();
    ws.wsSubmitCard(card);
    setCard('');
  };

  const handleSubmitDrawCard = card => {
    ws.wsSubmitCard(card);
  };

  return (
    <div id="game">
      { redirect.trim().length > 0 && <Redirect to={redirect} /> }
      {
        showPlayers &&
        <PlayerList players={gameData.players} idPlayer={userToken.id} />
      }
      <button
          id="showPlayers"
          onClick={() => setShowPlayers(!showPlayers)}
        >
        {showPlayers ? '◄' : '►'}
      </button>
      <div id="gameZone">
        {
          // Lobby
          !gameData.gameState.started &&
          <div>
            <h1>Dessin Sensé</h1>
            <h3>3 joueurs minimum</h3>
            <h3>Nombre de joueurs recommandé : 7</h3>
            <p>
              <label>
                Lien de la partie à partager :
                <input
                  id="lienPartie"
                  type="text"
                  value={window.location.href}
                  onFocus={(e) => e.target.select()}
                  readOnly
                />
              </label>
            </p>
            <button
              onClick={() => ws.wsStartGame()}
              disabled={!curPlayer.master}
            >
              Commencer
            </button>
            {
              !curPlayer.master &&
              <p>
                Seul Le joueur qui a créé la partie ({gameData.players.find(p => p.master).name}
                ) peut la lancer.
              </p>
            }
            {
              curPlayer.master &&
              gameData.players.map(p => p.online).length < 3 &&
              <p className="message-rouge">
                {`Il faut au moins 3 joueurs connectés 
                  avant de pouvoir lancer la partie.`}
              </p>
            }
          </div>
        }
        {
          // Phase texte
          gameData.gameState.started &&
          gameData.gameState.round % 2 !== 0 &&
          !cardSubmitted &&
            <div>
              <form onSubmit={handleSubmitTextCard}>
                <div>
                  { gameData.gameState.round > 1 && 
                    <h3>Séquence de {previousSequence.playerName}</h3> }
                  <label>
                    {
                      gameData.gameState.round === 1 ?
                        'Entrez une phrase qu\'un autre joueur devra dessiner : '
                        :
                        `Ecrivez ce que vous voyez sur ce dessin de 
                          ${previousCard.submitterName} : `
                    }
                    {
                      gameData.gameState.round > 1 &&
                      <div className="card">
                        <Stage width={600} height={350}>
                          <Layer>
                            {previousCard.value.lines.map((line, i) => (
                              <Line
                                key={`line${i}`}
                                points={line.points}
                                stroke="#0a0a0a"
                                strokeWidth={3}
                                tension={0.5}
                                lineCap="round"
                                globalCompositeOperation={'source-over'}
                              />
                            ))}
                            {previousCard.value.circles.map((circle, i) => (
                              <Circle
                                key={`circle${i}`}
                                x={circle.x}
                                y={circle.y}
                                fill="0a0a0a"
                                radius={2}
                              />
                            ))}
                          </Layer>
                        </Stage>
                      </div>
                    }
                    <textarea
                      className="card"
                      value={card}
                      onChange={handleTextCard}
                    />
                  </label>
                </div>
                <input type="submit" value="Valider" />
              </form>
            </div>
        }
        {
          // Phase dessin
          gameData.gameState.started &&
          gameData.gameState.round % 2 === 0 &&
          !cardSubmitted &&
          <div>
            <h3>Séquence de {previousSequence.playerName}</h3>
            <p>Dessinez la phrase de {previousCard.submitterName} : </p>
            <p className="card">{previousCard.value}</p>
            <Drawing submit={card => handleSubmitDrawCard(card)} />
          </div>
        }
        {
          // En attente d'autres joueurs
          gameData.gameState.started &&
          cardSubmitted &&
          !gameData.gameState.finished &&
          gameData.players.filter(p =>
            gameData.gameState.sequences
            .filter(seq => seq.sequence.length === gameData.gameState.round)
            .map(seq => seq.sequence[gameData.gameState.round - 1].submitterId)
            .findIndex(id => id === p.id) === -1
          ).map(p => (
            <p key={`attente${p.id}`}>En attente de {p.name} ...</p>
          ))
        }
        {
          // Fin de la partie
          gameData.gameState.started &&
          gameData.gameState.finished &&
          !gameData.gameState.currentSequence &&
          <div>
            <h2>Fin de la partie !</h2>
            <h3>
              Le créateur de la partie 
              ({gameData.players.find(p => p.master).name}) 
              va choisir une séquence à afficher.
            </h3>
            {
              gameData.gameState.sequences.map(s =>
                <button
                  onClick={() => ws.wsSetCurrentSequence(s.playerId, 1)}
                  key={'sequence' + s.playerId}
                  disabled={!curPlayer.master}
                >
                  Séquence de {s.playerName}
                </button>
              )
            }
            {
              <div>
                <button
                  onClick={() => ws.wsStartGame()}
                  disabled={!curPlayer.master}
                >
                  Faire une nouvelle partie
                  (ne sauvegardera pas la partie actuelle dans les archives)
                </button>
                <button onClick={() => setRedirect('/')}>Retour à la page d'accueil</button>
              </div>
            }
          </div>
        }
        {
          // Affichage séquence
          gameData.gameState.started &&
          gameData.gameState.finished &&
          gameData.gameState.currentSequence &&
          <div>
            <h2>Séquence de {gameData.gameState.currentSequence.sequence.playerName}</h2>
            <button
              style={{
                display: gameData.gameState.currentSequence.nbCardsToShow >= 
                  gameData.gameState.currentSequence.sequence.sequence.length ?
                  'none' : 'inline'
              }}
              onClick={() => ws.wsSetCurrentSequence(
                gameData.gameState.currentSequence.sequence.playerId,
                gameData.gameState.currentSequence.nbCardsToShow + 1
              )}
              disabled={!curPlayer.master}
            >
              Suite
            </button>
            <button
              onClick={() => ws.wsSetCurrentSequence()}
              disabled={!curPlayer.master}
            >
              Choisir une autre séquence
            </button>
            {
              gameData.gameState.currentSequence.sequence.sequence
                .slice(1, gameData.gameState.currentSequence.nbCardsToShow)
                .reverse()
                .map(seq => {
                  // Dessin
                  if (seq.type === 'dessin') {
                    return (
                      <div key={'seq' + seq.submitterId}>
                        <p className="bold">Dessin de {seq.submitterName}</p>
                        <div className="card">
                          <Stage width={600} height={350}>
                            <Layer>
                              {seq.value.lines.map((line, i) => (
                                <Line
                                  key={`line${i}`}
                                  points={line.points}
                                  stroke="#0a0a0a"
                                  strokeWidth={3}
                                  tension={0.5}
                                  lineCap="round"
                                  globalCompositeOperation={'source-over'}
                                />
                              ))}
                              {seq.value.circles.map((circle, i) => (
                                <Circle
                                  key={`circle${i}`}
                                  x={circle.x}
                                  y={circle.y}
                                  fill="0a0a0a"
                                  radius={2}
                                />
                              ))}
                            </Layer>
                          </Stage>
                        </div>
                      </div>
                    );
                  }

                  // Texte
                  return (
                    <div key={'seq' + seq.submitterId}>
                      <p className="bold">Phrase de {seq.submitterName}</p>
                      <p className="card">{seq.value}</p>
                    </div>
                  );
                })
            }
            <div>
              <h3>Phrase de départ :</h3>
              <p className="card">
                {gameData.gameState.currentSequence.sequence.sequence[0].value}
              </p>
            </div>
          </div>
        }
      </div>
    </div>
  );
};

const Archives = () => {
  const [games, setGames] = useState(null);
  const [gameData, setGameData] = useState(null);
  const [currentSequence, setCurrentSequence] = useState(null);
  const [redirect, setRedirect] = useState('');
  const { gameName } = useParams();

  useEffect(() => {
    const fetchArchives = async () => {
      const archives = await fetch(`${API_URL}/archives`)
        .then(response => response.json())
        .then(json => json.map(g => g.substring(0, g.length - 5)));

      setGames(archives);
    };

    const fetchGame = async () => {
      const game = await fetch(`${API_URL}/archives/${gameName}`)
        .then(response => response.json());
      
      setGameData(game);
    };

    if (gameName && !gameData) {
      fetchGame();
    } else if (!games) {
      fetchArchives();
    }
  });
  console.log(currentSequence);
  return (
    <div>
      { redirect.trim().length > 0 && <Redirect to={redirect} /> }
      <h1>Parties archivées</h1>
      <div>
        {
          !gameName && games &&
          games.map((g, i) =>
            <button onClick={() => setRedirect(`/archives/game/${g}`)} key={`archive${i}`}>
              {g}
            </button>
          )
        }
        {
          gameName && gameData && !currentSequence &&
            <div>
              {
                gameData.gameState.sequences.map(seq =>
                  <button
                    onClick={() => setCurrentSequence(
                      gameData.gameState.sequences.find(s => s.playerId === seq.playerId
                    ))}
                    key={'sequence' + seq.playerId}
                  >
                    Séquence de {seq.playerName}
                  </button>
                )
              }
              <button onClick={() => setRedirect('/archives/list')}>
                Retour aux parties archivées
              </button>
            </div>
        }
        {
          gameName && gameData && currentSequence &&
            <div>
              {
                currentSequence.sequence.map(seq => {
                  // Dessin
                  if (seq.type === 'dessin') {
                    return (
                      <div key={'seq' + seq.submitterId}>
                        <p className="bold">Dessin de {seq.submitterName}</p>
                        <div className="card">
                          <Stage width={600} height={350}>
                            <Layer>
                              {seq.value.lines.map((line, i) => (
                                <Line
                                  key={`line${i}`}
                                  points={line.points}
                                  stroke="#0a0a0a"
                                  strokeWidth={3}
                                  tension={0.5}
                                  lineCap="round"
                                  globalCompositeOperation={'source-over'}
                                />
                              ))}
                              {seq.value.circles.map((circle, i) => (
                                <Circle
                                  key={`circle${i}`}
                                  x={circle.x}
                                  y={circle.y}
                                  fill="0a0a0a"
                                  radius={2}
                                />
                              ))}
                            </Layer>
                          </Stage>
                        </div>
                      </div>
                    );
                  }
    
                  // Texte
                  return (
                    <div key={'seq' + seq.submitterId}>
                      <p className="bold">Phrase de {seq.submitterName}</p>
                      <p className="card">{seq.value}</p>
                    </div>
                  );
                })
              }
              <button onClick={() => setCurrentSequence(null)}>Choisir une autre séquence</button>
            </div>
        }
      </div>
    </div>
  );
};

const Accueil = () => {
  const [roomName, setRoomName] = useState(useParams().roomName || '');
  const userToken = useSelector(state => state.userToken);
  const [userName, setUserName] = useState(userToken ? userToken.name : '');
  const [redirect, setRedirect] = useState('');

  const ws = useContext(WebSocketContext);

  const handleRoomName = event => {
    setRoomName(event.target.value);
  };
  const handleUserName = event => {
    setUserName(event.target.value);
  };

  const handleSubmit = event => {
    event.preventDefault();
    if (roomName.trim().length === 0 || userName.trim().length === 0) return;

    const idUser = userToken ? userToken.id : uuidv4();

    ws.wsConnectToRoom(roomName, idUser, userName);
    setRedirect('/game/' + roomName);
  };

  return (
    <div id="accueil">
      {
        redirect.trim().length > 0 &&
        <Redirect to={redirect} />
      }
      <form onSubmit={handleSubmit}>
        <h1>Dessin Sensé</h1>
        <div>
          <label>
            Nom de la partie :
            <input type="text" value={roomName} onChange={handleRoomName} />
          </label>
        </div>
        <div>
          <label>
            Votre nom :
            <input type="text" value={userName} onChange={handleUserName} />
          </label>
        </div>
        <input type="submit" value="Créer / Rejoindre une partie" />
      </form>
      <div>
        <button onClick={() => setRedirect('/archives/list')}>Archives</button>
      </div>
    </div>
  );
};

const App = () => {
  const { store, persistor } = createStore();

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <WebSocketProvider>
          <Router>
            <Switch>
              <Route exact path="/">
                <Accueil />
              </Route>
              <Route exact path="/:roomName">
                <Accueil />
              </Route>
              <Route path="/game/:roomName">
                <Game />
              </Route>
              <Route exact path="/archives/list">
                <Archives />
              </Route>
              <Route path="/archives/game/:gameName">
                <Archives />
              </Route>
            </Switch>
          </Router>
        </WebSocketProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;
