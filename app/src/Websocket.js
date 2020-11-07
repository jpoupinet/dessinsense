import React, { createContext } from 'react';
import io from 'socket.io-client';
import { API_URL } from './config';
import { useDispatch } from 'react-redux';
import { connectToRoom, updateGameData, roomAlreadyExists } from './actions';

const WebSocketContext = createContext(null);

export { WebSocketContext };

export default function Websocket({ children }) {
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
    socket.emit('connectToRoom', data);
    dispatch(connectToRoom(data));
  };

  const wsStartGame = () => {
    socket.emit('startGame');
  };

  const wsSubmitCard = card => {
    socket.emit('submitCard', card);
  };

  if (!socket) {
    socket = io.connect(API_URL);

    socket.on('roomAlreadyExists', () => {
      dispatch(roomAlreadyExists());
    });

    socket.on('gameStateChange', gameData => {
      dispatch(updateGameData(gameData));
    });

    ws = {
      socket,
      wsConnectToRoom,
      wsStartGame,
      wsSubmitCard
    };
  }

  return (
    <WebSocketContext.Provider value={ws}>
      {children}
    </WebSocketContext.Provider>
  );
}
