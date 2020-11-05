import { CONNECT_TO_ROOM, UPDATE_GAME_DATA } from './actions';

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
        idGame: action.idGame,
        userToken: action.userToken,
        connectTime: action.connectTime
      };
    case UPDATE_GAME_DATA:
      return {
        ...state,
        gameData: action.data
      }
    default:
      return state;
  };
}
