import React, { useState, useContext } from 'react';
import { useParams, Redirect } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Stage, Layer, Line, Circle } from 'react-konva';

import Drawing from './Drawing';
import PlayerList from './PlayerList';
import mod from './modulo';
import { WebSocketContext } from './Websocket';
import { updateGameData } from './actions';

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

  if (!userToken || !idGame || roomName === 'archives') {
    return (<div>{<Redirect to={'/' + roomName} />}</div>);
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
              <div id="boutonsFinPartie">
                <button
                  onClick={() => ws.wsStartGame()}
                  disabled={!curPlayer.master}
                >
                  Faire une nouvelle partie
                </button>
                <button
                  onClick={() => {
                    ws.wsArchiveCurrentGame();
                    alert('Partie archivée');
                  }}
                  disabled={!curPlayer.master}
                >
                  Archiver la partie
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

export default Game;
