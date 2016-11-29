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

  let hashedPass = auth.hashPassword(body.password);
  db.insertUser({username: body.username, fullName: body.fullName, hashedPass: hashedPass});
  let user = db.getUser(body.username); 

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

  let user = db.getUser(body.username); 

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
  //extract user record from token
  var username = auth.cookieAuth.username(cookieToken)
  if (username){
    let bearerToken = auth.bearerAuth.mkToken(username);
    res.json({token: bearerToken});
  } else {
    res.json({token: ""});
  }
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

//serve data to authorized users
server.listen(3000, () => {
    console.log('Tigerface listening on port 3000!\n');
});
