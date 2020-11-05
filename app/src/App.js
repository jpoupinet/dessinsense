import {
  BrowserRouter as Router,
  Switch,
  Route,
  useParams,
  Redirect
} from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';

import WebSocketProvider, { WebSocketContext } from './WebSocket';

import store from './store';
import './App.css';

const Game = null;

const Accueil = null;

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
