// getOpponentNumber(1) = 2; getOpponentNumber(2) = 1
var getOpponentNumber = function(playerNumber) {
  return (playerNumber === 1 || playerNumber === '1') ? 2 : 1;
};

//Utility function to determine whether current player can take a turn
var updateTurn = function(session) {
  var player = session.get('player');
  var opponent = session.get('opponent');
  var hasTurn = (opponent.turn === player.turn) || (player.turn < opponent.turn);
  session.set('hasTurn', hasTurn);
};

//Utility function to return the hash of template helpers for each player
var getHelpers = function(session) {
 
  return {
    opponentMissing: function() {
      return session.get('opponentMissing');
    },

    hasTurn: function() {
      return session.get('hasTurn');
    },

    playerNumber: function() {
      return session.get('player').player;
    },

    opponentNumber: function() {
      return getOpponentNumber(session.get('player').player);
    },

    playerScore: function() {
      return session.get('player').score;
    },

    opponentScore: function() {
      return session.get('opponent').score;
    },

    playerTurn: function() {
      return session.get('player').turn;
    },

    opponentTurn: function() {
      return session.get('opponent').turn;
    },

    resultReady: function() {
      var roundStats = session.get('currentRound');
      return roundStats.result !== null;
    },

    lastResult: function() {
      var roundStats = session.get('currentRound');
      var result = null;
      if (roundStats.result) {
        if (roundStats.result === 'tie') {
          result = 'tied';
        } else if (roundStats.result === session.get('player')._id) {
          result = 'won';
        } else {
          result = 'lost';
        }
      }
      return result;
    },

    lastPlay: function() {
      var roundStats = session.get('currentRound');
      var lastPlay = roundStats[session.get('player')._id];
      return lastPlay;
    }
  }
};

var onButtonClick = function(e, session) {
  var choice = $(e.target).attr('class');
  var data = {choice: choice, playerId: session.get('player')._id, playerNum: session.get('player').player};
  Meteor.call('submitChoice', data);  
};

/*
 * Helper functions that return callbacks used in observeChanges handles
 */

var opponentCallbacks = function(session) {
  return {
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
    };
};

var playerCallbacks = function(session) {
  return {
      added: function(id, fields) {
        fields._id = id;
        session.set('player', fields);
      },
      changed: function(id, fields) {
        session.set('player', $.extend(session.get('player'), fields));
        updateTurn(session);
      }
    };
};

var roundCallbacks = function(session) {
  return {
      added: function(id, fields) {
        updateTurn(session);
      },
      changed: function(id, fields) {
        updateTurn(session);
        Meteor.call('getRound', id, function(err, result) {
          session.set('currentRound', result);
        });
      }
    };
};

//Utility function to initialize a player's session and data
var init = function(session) {
    var playerNumber = parseInt(localStorage.playerNumber);
    var opponentNumber = getOpponentNumber(playerNumber);

    session.set('hasTurn', false);
    session.set('opponent', {'player': opponentNumber, 'turn': 0, 'score': 0});
    session.set('opponentMissing', true);
    session.set('player', {'player': playerNumber, 'turn': 0, 'score': 0});
    session.set('currentRound', {'result': null});

    Meteor.call('getPlayer', playerNumber);

    // Sets up handles to watch for changes in server and update session variables accordingly
    var opponent = Players.find({'player': opponentNumber});
    var opponentHandle = opponent.observeChanges(opponentCallbacks(session));

    var player = Players.find({'player': playerNumber});
    var playerHandle = player.observeChanges(playerCallbacks(session));

    var rounds = Rounds.find({});
    var roundsHandle = rounds.observeChanges(roundCallbacks(session));
};



Template.player.helpers(getHelpers(Session));

Template.player.events({
  'click button': function (e) {
    onButtonClick(e, Session);
  }
});

Template.player.onCreated(function() {
   init(Session);
});