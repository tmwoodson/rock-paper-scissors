Players = new Mongo.Collection('players');
Rounds = new Mongo.Collection('rounds');

var getOpponentNumber = function(playerNumber) {
  console.log('getting opponent number for playerNumber', playerNumber)
  var result;
  if (playerNumber === 1 || playerNumber === '1') {
    result = 2;
  } else {
    result = 1;
  }
  console.log('Returning opponent number:', result);
  return result;
};

//Utility function to update function that says whether this player can take a turn
var updateTurn = function(session) {
  var player = session.get('player');
  var opponent = session.get('opponent');
  var hasTurn = (opponent.turn === player.turn) || (player.turn < opponent.turn);
  console.log('calling updateTurn:', hasTurn);
  session.set('hasTurn', hasTurn);
};

//Utility function to return the hash of template helpers for each player
var getHelpers = function(playerNumber, session) {
  var opponentNumber = getOpponentNumber(playerNumber);
 
  return {
    myData: function() {
      // return Players.find({ '_id': session.get('id') });
      return [session.get('player')];
    },

    opponentData: function() {
      // return Players.find({ 'player': opponentNumber }, {limit: 1});
      return [session.get('opponent')];
    },

    opponentMissing: function() {
      // return Players.find({'player': opponentNumber}).count() === 0;
      return session.get('opponentMissing');
    },

    hasTurn: function() {
      // return hasTurn(1, session.get('id'));
      return session.get('hasTurn');
    }
  };
};

//Utility function that returns the id of a round's winner
var getResult = function(player1, player2) {
  console.log('invoking getResult');
  console.log('player1:', player1);
  console.log('player2:', player2);
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

//Utility function to initialize a player's session and data
var init = function(playerNumber, session) {
    var opponentNumber = getOpponentNumber(playerNumber);

    // session.set('id', null);
    session.set('hasTurn', false);
    session.set('opponent', {'player': opponentNumber, 'turn': 0, 'score': 0});
    session.set('opponentMissing', true);
    session.set('self', {'player': playerNumber, 'turn': 0, 'score': 0});
    session.set('currentRound', {'result': null});

    Meteor.call('getPlayer', playerNumber);

    var opponent = Players.find({'player': opponentNumber});
    var opponentHandle = opponent.observeChanges({
      added: function(id, fields) {
        fields._id = id;
        console.log('opponent added:', id, fields);
        session.set('opponentMissing', false);
        session.set('hasTurn', true);
        session.set('opponent', fields);
      },
      changed: function(id, fields) {
        fields._id = id;
        console.log('opponent changed:', id, fields);
        session.set('opponent', $.extend(session.get('opponent'), fields));
        updateTurn(session);
      }
    });

    var self = Players.find({'player': playerNumber});
    var selfHandle = self.observeChanges({
      added: function(id, fields) {
        fields._id = id;
        console.log('self added:', id, fields);
        session.set('player', fields);
      },
      changed: function(id, fields) {
        // fields._id = id;
        console.log('player changed:', id, fields);
        session.set('player', $.extend(session.get('player'), fields));
        updateTurn(session);
      }
    });

    var rounds = Rounds.find({});
    var roundsHandle = rounds.observeChanges({
      added: function(id, fields) {
        console.log('starting new round', id, fields);
        session.set('currentRound', fields);
        updateTurn(session);
      },
      changed: function(id, fields) {
        console.log('round data updated:', id, fields);
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
      var choice = $(e.target).attr('class');
      // Rounds.insert({'player': playerNumber, 'turn':})
      var data = {choice: choice, playerId: Session.get('player')._id, playerNum: 1};
      Meteor.call('submitChoice', data);
    }
  });

  Template.player2.events({
    'click button': function (e) {
      // increment the number of turns
      var choice = $(e.target).attr('class');
      // Rounds.insert({'player': playerNumber, 'turn':})
      var data = {choice: choice, playerId: Session.get('player')._id, playerNum: 2};
      Meteor.call('submitChoice', data);    
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
        console.log('sending data to server:', data);
        // get current round
        var player = Players.findOne({'_id': data.playerId});
        var round = Rounds.findOne({'round': player.turn});
        console.log('player:', player);
        console.log('round', round);
        if (!round) {
          // create new round
          var newRound = { round: player.turn };
          newRound[player.player] = data.playerId;
          newRound[data.playerId] = data.choice;
          console.log('inserting new round into database:', newRound);
          Rounds.insert(newRound);
          Players.update(data.playerId, {$inc: {turn: 1} });
        } else {
          // update round
          var opponentNum = getOpponentNumber(data.playerNum);
          console.log('opponent number:', opponentNum);
          var opponentChoice = {'_id': round[opponentNum], 'choice': round[round[opponentNum]]};
          console.log('opponentChoice:', opponentChoice);
          data._id = data.playerId;
          var result = getResult(data, opponentChoice);
          var roundUpdates = {};
          roundUpdates[data.playerId] = data.choice;
          roundUpdates.result = result;
          console.log('result:', result);
          console.log('submitting these roundUpdates:', roundUpdates);
          Rounds.update(round._id, roundUpdates);
          //increment round value for player
          //update player data with results
          Players.update(data.playerId, {$inc: {turn: 1} });
          updatePlayerScores(data.playerId, round[opponentNum], result);
        }
      },

      'getPlayer': function(number) {
        number = parseInt(number);
        var player = Players.findOne({'player': number});
        if (player) {
          // return id
          return player.id;
        } else {
          return Players.insert({'player': number, 'turn': 0, 'score': 0});
        }
      },

      'getPlayerData': function(number) {
        number = parseInt(number);
        return Players.findOne({'player': number});
      }
    });

  });
}


Router.route('/player1');
Router.route('/player2');
Router.route('/', {
    template: 'home'
});
Router.configure({
    layoutTemplate: 'layout'
});
