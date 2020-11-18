import React from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import Accueil from './Accueil';
import Archives from './Archives';
import Game from './Game';
import WebSocketProvider from './Websocket';
import createStore from './store';

import './App.css';

const App = () => {
  const { store, persistor } = createStore();

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
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
              <Route exact path="/archives/list">
                <Archives />
              </Route>
              <Route path="/archives/game/:gameName">
                <Archives />
              </Route>
            </Switch>
          </Router>
        </WebSocketProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;
