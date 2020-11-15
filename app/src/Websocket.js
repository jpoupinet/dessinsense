import React, { createContext } from 'react';
import io from 'socket.io-client';
import { API_URL } from './config';
import { useDispatch, useSelector } from 'react-redux';
import { connectToRoom, updateGameData, roomAlreadyExists } from './actions';

const WebSocketContext = createContext(null);

export { WebSocketContext };

export default function Websocket({ children }) {
  let socket;
  let ws;

  const idGame = useSelector(state => state.idGame);
  const userToken = useSelector(state => state.userToken);

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

  const wsSetCurrentSequence = (seqPlayerId = null, nbCardsToShow = null) => {
    const payload = {
      seqPlayerId,
      nbCardsToShow
    };
    socket.emit('setCurrentSequence', payload);
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
      wsSubmitCard,
      wsSetCurrentSequence
    };
  }

  return (
    <WebSocketContext.Provider value={ws}>
      {children}
    </WebSocketContext.Provider>
  );
}
