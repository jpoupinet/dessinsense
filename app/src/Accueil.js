import React, { useState, useContext } from 'react';
import { useParams, Redirect } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';

import { WebSocketContext } from './Websocket';

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

export default Accueil;