'use strict';
var express = require('express');
var server = express();
var path = require('path');
var request = require('request');
var server = express();
var cookieParser = require('cookie-parser')
var bodyParser = require('body-parser');
var _ = require('lodash');
var q = require('q');
var path = require('path');
var auth = require('./auth');

var syntax = require('./syntax');
var db = require('./db');
var model = require('./model').mk(db);

var jsonParse = bodyParser.json();
var rawParse = bodyParser.raw({type: "*/*", limit: '4000kb'});

server.use(cookieParser());

var serveFile = (fileName => ((req, res, next) => {
  var options = {
    root: path.resolve(__dirname + '/../front/'),
    dotfiles: 'deny',
    headers: {
      'x-timestamp': Date.now(),
      'x-sent': true
    }
  };

  res.sendFile(fileName, options, err => {
    if (err) {
      console.log(err);
      res.status(err.status).end();
    } else {
      //console.log('Sent:', fileName);
    }
  });

}));

var bearerTokenFromReq = (req => {
  var authHeader = req.headers.authorization;
  var prefix = "Bearer ";
  var startIndex = authHeader ? authHeader.indexOf(prefix) : -1;
  return startIndex == 0 ? authHeader.substring(prefix.length) : "" 
});

var cookieTokenFromReq = (req => {
  return req.cookies[auth.cookieName];
})


//serve static files by filename
server.use('/', express.static(path.resolve(__dirname + '/../front/')));

//serve index.html by root path 
server.get("/$", jsonParse, serveFile("index.html"));
server.get("/profile/*", jsonParse, serveFile("profile.html"));

server.post("/signup", jsonParse, (req, res, next) => {
  var body = req.body;
  if (!body.fullName) {
    return next("full name must contain one or more letters, numbers, hyphens, or spaces only.");
  }

  if (!syntax.hasUsernameSyntax(body.username)) {
    return next("username must contain one or more lowercase letters or numbers only.");
  }

  if (!syntax.hasPasswordSyntax(body.password)) {
    return next("password must contain one or more lowercase letters or numbers only.");
  }

  if (model.getUser(body.username)) {
    return next("username already exists");
  }

  let hashedPass = auth.hashPassword(body.password);
  model.insertUser({username: body.username, fullName: body.fullName, hashedPass: hashedPass});
  let user = model.getUser(body.username); 

  //send back auth tokens
  let cookieToken = auth.cookieAuth.mkToken(user.username);
  res.cookie(auth.cookieName, cookieToken, {httpOnly: true});

  let bearerToken = auth.bearerAuth.mkToken(user.username);
  res.json({token: bearerToken});

});

server.post("/logout", jsonParse, (req, res, next) => {
  //clear auth cookie
  res.clearCookie(auth.cookieName, {httpOnly: true});
  res.json({});

});

server.post("/login", jsonParse, (req, res, next) => {
  var body = req.body;

  if (!syntax.hasUsernameSyntax(body.username)) {
    return next("username must contain one or more lowercase letters or numbers only.");
  }

  if (!syntax.hasPasswordSyntax(body.password)) {
    return next("password must contain one or more lowercase letters or numbers only.");
  }

  let user = model.getUser(body.username); 

  if (!auth.verifyPassword(user.hashedPass, body.password)) {
    return next("username or password does not match our records.");
  }

  //send back auth tokens
  let cookieToken = auth.cookieAuth.mkToken(user.username);
  res.cookie(auth.cookieName, cookieToken, {httpOnly: true});

  let bearerToken = auth.bearerAuth.mkToken(user.username);
  res.json({token: bearerToken});

});


//serve auth tokens
server.get("/token", jsonParse, (req, res, next) => {
  var cookieToken = cookieTokenFromReq(req);
  //extract username record from token
  var username = auth.cookieAuth.username(cookieToken)
  if (username){
    let bearerToken = auth.bearerAuth.mkToken(username);
    res.json({token: bearerToken});
  } else {
    res.json({token: ""});
  }
});

server.get("/user", jsonParse, (req, res, next) => {
  let bearerToken = bearerTokenFromReq(req);
  let username = auth.bearerAuth.username(bearerToken)
  if (username){
    let user = model.getUser(username);

    let followees = _.map(_.filter(model.getFollow(username), r => {
      return r.status == 'active'
    }), r => r.followee);
    let pendingFollowees = _.map(_.filter(model.getFollow(username), r => r.status == 'pending'), r => r.followee);

    let followers = _.map(_.filter(model.getFollowByFollowee(username), r => r.status == 'active'), r => r.follower);
    let pendingFollowers = _.map(_.filter(model.getFollowByFollowee(username), r => r.status == 'pending'), r => r.follower);

    res.json({user: _.assign(_.omit(user, 'hashedPass'), {
      followees: followees,
      pendingFollowees: pendingFollowees,
      followers: followers,
      pendingFollowers: pendingFollowers
    })});
  } else {
    res.json({user: null});
  }
});

server.get("/profile", jsonParse, (req, res, next) => {
  let query = req.query;
  let bearerToken = bearerTokenFromReq(req);
  let username = auth.bearerAuth.username(bearerToken)
  if (username && (username == query.username || true)){
    let profile = model.getProfile(query.username, username);
    res.json({profile: profile});
  } else {
    res.json({profile: null});
  }
});

server.post("/follow", jsonParse, (req, res, next) => {

  let bearerToken = bearerTokenFromReq(req);
  let username = auth.bearerAuth.username(bearerToken)
  let follower = model.getUser(username);

  if (!follower) {
    return next("user must be logged in");
  }
  var body = req.body;
  let followee = model.getUser(body.followee);
  if (!followee) {
    return next("followee does not exist");
  }

  if (follower.username == followee.username) {
    return next("logged in user must be different from followee");
  }

  model.insertFollow(follower.username, followee.username);
  res.json({});

});

server.post("/unfollow", jsonParse, (req, res, next) => {

  let bearerToken = bearerTokenFromReq(req);
  let username = auth.bearerAuth.username(bearerToken)
  let follower = model.getUser(username);
  if (!follower) {
    return next("user must be logged in");
  }
  var body = req.body;
  let followee = model.getUser(body.followee);
  if (!followee) {
    return next("followee does not exist");
  }

  if (follower.username == followee.username) {
    return next("logged in user must be different from followee");
  }

  model.removeFollow(follower.username, followee.username);
  res.json({});

});


server.post("/acceptFollower", jsonParse, (req, res, next) => {

  let bearerToken = bearerTokenFromReq(req);
  let username = auth.bearerAuth.username(bearerToken)
  let followee = model.getUser(username);
  if (!followee) {
    return next("user must be logged in");
  }
  var body = req.body;
  let follower = model.getUser(body.follower);
  if (!follower) {
    return next("follower does not exist");
  }

  if (follower.username == followee.username) {
    return next("logged in user must be different from followee");
  }

  model.activateFollow(follower.username, followee.username);
  res.json({});

});

server.post("/removeFollower", jsonParse, (req, res, next) => {

  let bearerToken = bearerTokenFromReq(req);
  let username = auth.bearerAuth.username(bearerToken)
  let followee = model.getUser(username);
  if (!followee) {
    return next("user must be logged in");
  }
  var body = req.body;
  let follower = model.getUser(body.follower);
  if (!follower) {
    return next("follower does not exist");
  }

  if (follower.username == followee.username) {
    return next("logged in user must be different from followee");
  }

  model.removeFollow(follower.username, followee.username);
  res.json({});

});


server.post("/deletepic", jsonParse, (req, res, next) => {

  let bearerToken = bearerTokenFromReq(req);
  let username = auth.bearerAuth.username(bearerToken)
  let user = model.getUser(username);
  if (!user) {
    return next("user must be logged in");
  }

  model.deleteUserPic(username);
  res.json({});

});



server.put("/picture", rawParse, function(req, res, next) {

  let bearerToken = bearerTokenFromReq(req);
  let username = auth.bearerAuth.username(bearerToken)
  let user = model.getUser(username);
  if (!user) {
    return next("user must be logged in");
  }

  let data = req.body;
  model.updateUserPic(username, data);
  res.json({});

});

server.post("/note", jsonParse, (req, res, next) => {
  let bearerToken = bearerTokenFromReq(req);
  let username = auth.bearerAuth.username(bearerToken)
  let user = model.getUser(username);
  if (!user) {
    return next("user must be logged in");
  }

  let body = req.body;
  let profileId = body.profileId;
  let textBody = body.textBody;

  let follow = _.find(model.getFollow(username), r => r.followee == profileId);
  if ((username != profileId) && (!follow || follow.status != 'active')) {
    return next("user must be the profile's user or be a follower of profile's user");
  } 

  model.insertNote({profileId: profileId, textBody: textBody, author: username});
  res.json({});

});


server.get("/save", jsonParse, (req, res, next) => {
  db.save();
  res.redirect('/');
});

server.get("/load", jsonParse, (req, res, next) => {
  db.load();
  res.redirect('/');
});

server.use((err, req, res, next) => {
  if (err.statusCode !== undefined) {
    console.log("Error: ", err.body);
    res.status(err.statusCode);
    res.json(err.body);
  } else if (_.isString(err)){
    console.log("Error: ", err);
    res.status(400);
    res.json({
      "name": "error",
      "errors": [err]
    });
  } else {
    console.log("Error: ", err);
    res.status(400);
    res.json(err);
  }
});


db.load();

process.on ('SIGINT', () => {
  process.exit (0);
});

process.on('exit', (code) => {
  db.save();
});

//serve data to authorized users
server.listen(3000, () => {
    console.log('Tigerface listening on port 3000!\n');
});
