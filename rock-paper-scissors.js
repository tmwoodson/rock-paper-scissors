Players = new Mongo.Collection('players');

if (Meteor.isClient) {

  Template.player1.helpers({
    myStats: function() {
      return Players.find({ 'player': 1 });
    },

    opponentStats: function() {
      return Players.find({ 'player': 2 });
    }
  });

  Template.player2.helpers({
    myStats: function() {
      return Players.find({ 'player': 2 });
    },

    opponentStats: function() {
      return Players.find({ 'player': 1 });
    }
  });

  Template.player1.events({
    'click button': function () {
      console.log('what are my stats?', Players.find({}));
    }
  });

  Template.player2.events({
    'click button': function () {
      // increment the number of turns
      
    }
  });

  Template.player1.onRendered(function() {
    var player = Players.find({'player': 1}).fetch();
    var id;
    if (player.length) {
      // player already exists
      console.log('Here are my stats:', player[0]);
      id = player[0]._id;
    } else {
      id = Players.insert({'player': 1, 'turn': 0, 'score': 0});
    }
    Session.set('id', id);
  });

  Template.player2.onRendered(function() {
    var playerId = Players.insert({'player': 2, 'turn': 0, 'score': 0});
    Session.set('id', playerId);
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
