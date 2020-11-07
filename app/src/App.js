import React, { useState, useContext } from 'react';
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
import { fabric } from 'fabric';

import WebSocketProvider, { WebSocketContext } from './Websocket';
import createStore from './store';
import { updateGameData } from './actions';

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

  const [gameInit, setGameInit] = useState(false);
  const [showPlayers, setShowPlayers] = useState(true);
  const [cardSubmitted, setCardSubmitted] = useState(false);
  const [card, setCard] = useState('');

  const dispatch = useDispatch();
  const ws = useContext(WebSocketContext);

  const curPlayer = gameData ? gameData.players.find(p => p.id === userToken.id) : null;

  const previousCard = gameData  && gameData.gameState.round > 1 ?
    gameData.gameState.sequences[
      mod(
        gameData.players.findIndex(p => p.id === userToken.id) -
        (gameData.gameState.round - 1),
        gameData.players.length
      )
    ].sequence[gameData.gameState.round - 2]
    :
    null;

  const zoneDessin = new fabric.Canvas('zoneDessin', {
    isDrawingMode: true
  });
  zoneDessin.freeDrawingBrush.width = 5;

  const zoneDessinFixe = new fabric.StaticCanvas('zoneDessinFixe');
  if (gameData && gameData.gameState.round > 1 && gameData.gameState.round % 2 !== 0) {
    zoneDessinFixe.loadFromJSON(previousCard.value);
  }

  const handleTextCard = event => {
    setCard(event.target.value);
  };

  const handleSubmitCard = event => {
    event.preventDefault();
    ws.wsSubmitCard(card);
    setCardSubmitted(true);
    setCard('');
  }

  if (roomName !== idGame && userToken) {
    dispatch(updateGameData(null));
    ws.wsConnectToRoom(roomName, userToken.id, userToken.name);
    return (<div></div>);
  }

  if (!userToken) {
    return (<div>{!idGame && <Redirect to={'/' + roomName} />}</div>);
  }

  if (!gameInit) {
    ws.wsConnectToRoom(roomName, userToken.id, userToken.name);
    setGameInit(true);
    return (<div></div>);
  }

  if (!gameData) {
    return (<div></div>);
  }

  return (
    <div id="game">
      {
        showPlayers &&
        <PlayerList players={gameData.players} idPlayer={userToken.id} />
      }
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
              <p>{`Seul Le joueur qui a créé la partie peut la lancer.`}</p>
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
              {
                gameData.gameState.round > 1 &&
                <canvas id="zoneDessinFixe" />
              }
              <form onSubmit={handleSubmitCard}>
                <p>
                  <label>
                    {
                      gameData.gameState.round === 1 ?
                        'Entrez une phrase qu\'un autre joueur devra dessiner : '
                        :
                        'Ecrivez ce que vous voyez sur ce dessin : '
                    }
                    <textarea
                      value={card}
                      onChange={handleTextCard}
                    />
                  </label>
                </p>
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
            <p>La phrase à dessiner est : </p>
            <h2>{previousCard.value}</h2>
            <canvas id="zoneDessin" />
            <button onClick={() => {
              console.log(JSON.stringify(zoneDessin));
              // ws.wsSubmitCard(JSON.stringify(zoneDessin));
              setCardSubmitted(true);
            }}>Envoyer</button>
          </div>
        }
        {
          // En attente d'autres joueurs
          gameData.gameState.started && cardSubmitted &&
          <div>En attente ...</div>
        }
        {
          // Fin de la partie
          gameData.gameState.started && gameData.finished &&
          <div>Fini</div>
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
    setRedirect(roomName);
  };

  return (
    <div id="accueil">
      {
        redirect.trim().length > 0 &&
        <Redirect to={'/game/' + redirect} />
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
            </Switch>
          </Router>
        </WebSocketProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;
