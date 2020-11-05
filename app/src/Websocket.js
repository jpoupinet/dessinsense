import React, { createContext } from 'react';
import io from 'socket.io-client';
import { API_URL } from './config';
import { useDispatch } from 'react-redux';
import { connectToRoom } from './actions';
import { updateGameData } from './actions';

const WebSocketContext = createContext(null);

export { WebSocketContext };

export default ({ children }) => {
  let socket;
  let ws;

  const dispatch = useDispatch();

  const wsConnectToRoom = (idGame, idUser, nameUser) => {
    const data = {
      idGame,
      userToken: {
        id: idUser,
        name: nameUser
      },
      connectTime: Date.now()
    };
    socket.emit('connectToRoom', JSON.stringify(data));
    dispatch(connectToRoom(data));
  };

  const wsUpdateGameData = data => {
    dispatch(updateGameData(data));
  };

  if (!socket) {
    socket = io.connect(API_URL);

    socket.on('gameStateChange', gameData => {
      const data = JSON.parse(gameData);
      dispatch(updateGameData(data));
    });

    ws = {
      socket,
      wsConnectToRoom,
      wsUpdateGameData
    };
  }

  return (
    <WebSocketContext.Provider value={ws}>
      {children}
    </WebSocketContext.Provider>
  );
};
