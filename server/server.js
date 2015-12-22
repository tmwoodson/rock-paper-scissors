var getOpponentNumber = function(playerNumber) {
  return (playerNumber === 1 || playerNumber === '1') ? 2 : 1;
};

var updatePlayerScores = function(id1, id2, result) {
  if (result === 'tie') {
    Players.update(id1, {$inc: {score: 1} });
    Players.update(id2, {$inc: {score: 1} });
  } else if (result === id1) {
    Players.update(id1, {$inc: {score: 1} });
  } else {
    Players.update(id2, {$inc: {score: 1} });
  }
};

//Utility function that returns the id of a round's winner
var getResult = function(player1, player2) {
  if (player1.choice === player2.choice) {
    return 'tie';
  }
  if (player1.choice === 'rock') {
    return (player2.choice === 'scissors') ? player2._id : player1._id;
  } else if (player1.choice === 'scissors') {
    return (player2.choice === 'rock') ? player2._id : player1._id;
  } else if (player1.choice === 'paper') {
    return (player2.choice === 'scissors') ? player2._id : player1._id;
  }
};

Meteor.startup(function () {

  Meteor.methods({
    'submitChoice': function(data){
      // get current round
      var player = Players.findOne({'_id': data.playerId});
      var round = Rounds.findOne({'round': player.turn});
      if (!round) {
        // create new round
        var newRound = { round: player.turn };
        newRound[player.player] = data.playerId;
        newRound[data.playerId] = data.choice;
        Rounds.insert(newRound);
        Players.update(data.playerId, {$inc: {turn: 1} });
      } else {
        // update round
        var opponentNum = getOpponentNumber(data.playerNum);
        var opponentChoice = {'_id': round[opponentNum], 'choice': round[round[opponentNum]]};
        data._id = data.playerId;
        var result = getResult(data, opponentChoice);
        round[data.playerId] = data.choice;
        round.result = result;
        Rounds.update(round._id, round);
        Players.update(data.playerId, {$inc: {turn: 1} });
        updatePlayerScores(data.playerId, round[opponentNum], result);
      }
    },

    'getPlayer': function(number) {
      number = parseInt(number);
      var player = Players.findOne({'player': number});
      if (player) {
        return player.id;
      } else {
        return Players.insert({'player': number, 'turn': 0, 'score': 0});
      }
    },

    'getRound': function(id) {
      var found = Rounds.findOne({'_id': id});
      return found;
    }
  });

});