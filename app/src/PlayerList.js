const PlayerList = ({ players, idPlayer, showPlayers }) => {
  return (
    <div id="players" style={{ display: showPlayers ? 'block' : 'none' }}>
      <p id="header">Liste des joueurs</p>
      {players.map(player => {
        if (player.id === idPlayer) {
          return (<p id="curPlayer" key={player.id}>{player.name}</p>);
        }

        return (
          <div
            key={player.id}
            className={player.online ? 'player' : 'player-offline'}
          >
            <p>{player.name}{!player.online && ' - Déconnecté(e)'}</p>
          </div>
        );
      })}
    </div >
  );
};

export default PlayerList;
