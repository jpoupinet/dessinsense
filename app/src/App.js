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

const Game = null;

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
