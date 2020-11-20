import React, { useState, useEffect } from 'react';
import { useParams, Redirect } from 'react-router-dom';

import { API_URL } from './config';

const Archives = () => {
  const [games, setGames] = useState(null);
  const [gameData, setGameData] = useState(null);
  const [currentSequence, setCurrentSequence] = useState(null);
  const [redirect, setRedirect] = useState('');
  const { gameName } = useParams();

  useEffect(() => {
    const fetchArchives = async () => {
      const archives = await fetch(`${API_URL}/archives`)
        .then(response => response.json())
        .then(json => json.map(g => g.substring(0, g.length - 5)));

      setGames(archives);
    };

    const fetchGame = async () => {
      const game = await fetch(`${API_URL}/archives/${gameName}`)
        .then(response => response.json());
      
      setGameData(game);
    };

    if (gameName && !gameData) {
      fetchGame();
    } else if (!games) {
      fetchArchives();
    }
  });
  
  return (
    <div id="archives">
      { redirect.trim().length > 0 && <Redirect to={redirect} /> }
      <h1>Parties archivées</h1>
      <div className="boutonsSequences">
        {
          !gameName && games &&
            games.map((g, i) =>
              <button
                onClick={() => {
                  setGameData(null);
                  setRedirect(`/archives/game/${g}`);
                }}
                key={`archive${i}`}
              >
                {`
                  ${g.substr(0, g.lastIndexOf('-'))} - 
                  ${new Date(parseInt(g.substr(g.lastIndexOf('-') + 1)))
                    .toLocaleString('fr-FR')}
                `}
              </button>
            )
        }
        {
          gameName && gameData && !currentSequence &&
            <div>
              <h3>{`
                ${gameName.substr(0, gameName.lastIndexOf('-'))} - 
                ${new Date(parseInt(gameName.substr(gameName.lastIndexOf('-') + 1)))
                  .toLocaleString('fr-FR')}
              `}</h3>
              {
                gameData.gameState.sequences.map(seq =>
                  <button
                    onClick={() => setCurrentSequence(
                      gameData.gameState.sequences.find(s => s.playerId === seq.playerId
                    ))}
                    key={'sequence' + seq.playerId}
                  >
                    Séquence de {seq.playerName}
                  </button>
                )
              }
              <br/>
              <button onClick={() => setRedirect('/archives/list')}>
                Retour aux parties archivées
              </button>
            </div>
        }
        {
          gameName && gameData && currentSequence &&
            <div>
              {
                currentSequence.sequence.map(seq => {
                  // Dessin
                  if (seq.type === 'dessin') {
                    return (
                      <div key={'seq' + seq.submitterId}>
                        <p className="bold">Dessin de {seq.submitterName}</p>
                        <div className="card">
                          <img src={seq.value} alt="Dessin séquence" />
                        </div>
                      </div>
                    );
                  }
    
                  // Texte
                  return (
                    <div key={'seq' + seq.submitterId}>
                      <p className="bold">Phrase de {seq.submitterName}</p>
                      <div className="card">
                        <p>{seq.value}</p>
                      </div>
                    </div>
                  );
                })
              }
              <button onClick={() => setCurrentSequence(null)}>Choisir une autre séquence</button>
            </div>
        }
      </div>
      <button onClick={() => setRedirect('/')} style={{ marginTop: '20px' }}>
        Retourner à l'accueil
      </button>
    </div>
  );
};

export default Archives;
