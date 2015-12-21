Players = new Mongo.Collection('players');
Rounds = new Mongo.Collection('rounds');

var getOpponentNumber = function(playerNumber) {
  var result;
  if (playerNumber === 1 || playerNumber === '1') {
    result = 2;
  } else {
    result = 1;
  }
  return result;
};

//Utility function to update function that says whether this player can take a turn
var updateTurn = function(session) {
  var player = session.get('player');
  var opponent = session.get('opponent');
  var hasTurn = (opponent.turn === player.turn) || (player.turn < opponent.turn);
  session.set('hasTurn', hasTurn);
};

//Utility function to return the hash of template helpers for each player
var getHelpers = function(playerNumber, session) {
  var opponentNumber = getOpponentNumber(playerNumber);
 
  return {
    myData: function() {
      return [session.get('player')];
    },

    opponentData: function() {
      return [session.get('opponent')];
    },

    opponentMissing: function() {
      return session.get('opponentMissing');
    },

    hasTurn: function() {
      return session.get('hasTurn');
    }
  };
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

var onButtonClick = function(e, session) {
  var choice = $(e.target).attr('class');
  var data = {choice: choice, playerId: session.get('player')._id, playerNum: session.get('player').player};
  Meteor.call('submitChoice', data);  
};

//Utility function to initialize a player's session and data
var init = function(playerNumber, session) {
    var opponentNumber = getOpponentNumber(playerNumber);

    session.set('hasTurn', false);
    session.set('opponent', {'player': opponentNumber, 'turn': 0, 'score': 0});
    session.set('opponentMissing', true);
    session.set('player', {'player': playerNumber, 'turn': 0, 'score': 0});
    session.set('currentRound', {'result': null});

    Meteor.call('getPlayer', playerNumber);

    var opponent = Players.find({'player': opponentNumber});
    var opponentHandle = opponent.observeChanges({
      added: function(id, fields) {
        fields._id = id;
        session.set('opponentMissing', false);
        session.set('hasTurn', true);
        session.set('opponent', fields);
      },
      changed: function(id, fields) {
        fields._id = id;
        session.set('opponent', $.extend(session.get('opponent'), fields));
        updateTurn(session);
      }
    });

    var player = Players.find({'player': playerNumber});
    var playerHandle = player.observeChanges({
      added: function(id, fields) {
        fields._id = id;
        session.set('player', fields);
      },
      changed: function(id, fields) {
        session.set('player', $.extend(session.get('player'), fields));
        updateTurn(session);
      }
    });

    var rounds = Rounds.find({});
    var roundsHandle = rounds.observeChanges({
      added: function(id, fields) {
        session.set('currentRound', fields);
        updateTurn(session);
      },
      changed: function(id, fields) {
        session.set('currentRound', $.extend(session.get('currentRound'), fields));
        updateTurn(session);
      }
    });
};

if (Meteor.isClient) {

  Template.player1.helpers(getHelpers(1, Session));

  Template.player2.helpers(getHelpers(2, Session));

  Template.player1.events({
    'click button': function (e) {
      onButtonClick(e, Session);
    }
  });

  Template.player2.events({
    'click button': function (e) {
      onButtonClick(e, Session);   
    }
  });

  Template.player1.onCreated(function() {
    init(1, Session);
  });

  Template.player2.onCreated(function() {
    init(2, Session);
  });

}

var updatePlayerScores = function(id1, id2, result) {
  console.log('updating player scores:', arguments)
  if (result === 'tie') {
    Players.update(id1, {$inc: {score: 1} });
    Players.update(id2, {$inc: {score: 1} });
  } else if (result === id1) {
    Players.update(id1, {$inc: {score: 1} });
  } else {
    Players.update(id12, {$inc: {score: 1} });
  }
};

if (Meteor.isServer) {
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
          var roundUpdates = {};
          roundUpdates[data.playerId] = data.choice;
          roundUpdates.result = result;
          Rounds.update(round._id, roundUpdates);
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
      }
    });

  });
}

// Routes
Router.route('/player1');
Router.route('/player2');
Router.route('/', {
    template: 'home'
});
Router.configure({
    layoutTemplate: 'layout'
});
