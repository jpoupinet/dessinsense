import React, { useState, useContext } from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  useParams,
  Redirect
} from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';

import WebSocketProvider, { WebSocketContext } from './Websocket';
import store from './store';

import './App.css';

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
  const idGame = useSelector(state => state.idGame);
  const userToken = useSelector(state => state.userToken);
  const gameData = useSelector(state => state.gameData);

  const [showPlayers, setShowPlayers] = useState(true);
  const [cardSubmitted, setCardSubmitted] = useState(false);

  const curPlayer = gameData ? gameData.players.find(p => p.id === userToken.id) : null;

  const startGame = () => {

  };

  return (
    <div id="game">
      {!idGame && <Redirect to={'/'} />}
      {
        gameData && showPlayers &&
        <PlayerList players={players} idPlayer={userToken.id} />
      }
      <div id="gameZone">
        {
          // Lobby
          gameData && !gameData.started &&
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
              onClick={() => startGame()}
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
              players.map(p => p.online).length < 3 &&
              <p className="message-rouge">
                {`Il faut au moins 3 joueurs connectés 
                  avant de pouvoir lancer la partie.`}
              </p>
            }
          </div>
        }
        {
          // Phase texte
          gameData && gameData.started && gameData.round % 2 !== 0 &&
          <div></div>
        }
        {
          // Phase dessin
          gameData && gameData.started && gameData.round % 2 === 0 &&
          <div></div>
        }
        {
          // En attente d'autres joueurs
          gameData && !gameData.started && cardSubmitted &&
          <div></div>
        }
        {
          // Fin de la partie
          gameData && gameData.started && gameData.finished &&
          <div></div>
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
  return (
    <Provider store={store}>
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
    </Provider>
  );
}

export default App;
