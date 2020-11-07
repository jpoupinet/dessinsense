import { CONNECT_TO_ROOM, UPDATE_GAME_DATA, ROOM_ALREADY_EXISTS } from './actions';

const initialState = {
  idGame: null,
  userToken: null,
  connectTime: null,
  gameData: null
};

export default function roomReducer(state = initialState, action) {
  switch (action.type) {
    case CONNECT_TO_ROOM:
      return {
        ...state,
        idGame: action.data.idGame,
        userToken: action.data.userToken,
        connectTime: action.data.connectTime
      };
    case UPDATE_GAME_DATA:
      return {
        ...state,
        gameData: action.data
      };
    case ROOM_ALREADY_EXISTS:
      return {
        ...state,
        idGame: null
      };
    default:
      return state;
  };
}
