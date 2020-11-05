export const CONNECT_TO_ROOM = 'CONNECT_TO_ROOM';
export const UPDATE_GAME_DATA = 'UPDATE_GAME_DATA';

export const connectToRoom = data => ({
  type: CONNECT_TO_ROOM,
  data
});

export const updateGameData = data => ({
  type: UPDATE_GAME_DATA,
  data
});
