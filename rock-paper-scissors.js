// Collections used by client and server
Players = new Mongo.Collection('players');
Rounds = new Mongo.Collection('rounds');


// Routes
Router.route('/player1', function() {
  localStorage.playerNumber = 1;
  this.render('player');
});
Router.route('/player2', function() {
  localStorage.playerNumber = 2;
  this.render('player');
});
Router.route('/', {
    template: 'home'
});
Router.configure({
    layoutTemplate: 'layout'
});
