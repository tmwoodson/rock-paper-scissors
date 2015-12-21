Players = new Mongo.Collection('players');
Rounds = new Mongo.Collection('rounds');

var getOpponentNumber = function(playerNumber) {
  if (playerNumber === 1) {
    return 2;
  }
  return 1;
};

//Utility function to compute whether player can submit a choice.
var hasTurn = function(playerNumber, id) {
  var opponentNumber = getOpponentNumber();

  var opponent = Players.find({'player': opponentNumber}, {limit: 1});
  if (opponent.count() === 0) {
    return false;
  }
  var opponentStats = opponent.fetch()[0];
  var myStats = Players.find({ '_id': id }).fetch()[0];

  console.log('using hasTurn. OpponentStats:', opponentStats);
  console.log('using hasTurn. MyStats:', myStats);
  return (opponentStats.turn === myStats.turn) || (myStats.turn < opponentStats.turn);    
};

//Utility function to return the hash of template helpers for each player
var getHelpers = function(playerNumber, session) {
  var opponentNumber = getOpponentNumber();
 
  return {
    myData: function() {
      return Players.find({ '_id': session.get('id') });
    },

    opponentData: function() {
      return Players.find({ 'player': opponentNumber }, {limit: 1});
    },

    opponentMissing: function() {
      return Players.find({'player': opponentNumber}).count() === 0;
    },

    hasTurn: function() {
      return hasTurn(1, session.get('id'));
    }
  };
};

var init = function(playerNumber, session) {
    var opponentNumber = getOpponentNumber();

    var player = Players.find({'player': playerNumber}).fetch();
    var id;
    if (player.length) {
      id = player[0]._id;
      console.log('player already exists; using old id:', id);
    } else {
      id = Players.insert({'player': playerNumber, 'turn': 0, 'score': 0});
      console.log('player did not exist; creating new record:', id);
    }
    session.set('id', id);
    session.set('previousResult', {});
    
    var opponent = Players.find({'player': opponentNumber});
    var handle = opponent.observeChanges({
      added: function(id, fields) {
        console.log('player added:', id, fields);
      },
      changed: function(id, fields) {
        console.log('player changed:', id, fields);
      }
    });
};

if (Meteor.isClient) {

  Template.player1.helpers(getHelpers(1, Session));

  Template.player2.helpers(getHelpers(2, Session));

  Template.player1.events({
    'click button': function (e) {
      console.log('what is target?', $(e.target).hasClass('rock'));
    }
  });

  Template.player2.events({
    'click button': function () {
      // increment the number of turns
      
    }
  });

  Template.player1.onCreated(function() {
    init(1, Session);
  });

  Template.player2.onCreated(function() {
    init(2, Session);
  });

}

if (Meteor.isServer) {
  Meteor.startup(function () {

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
