'use strict';
var express = require('express');
var server = express();
var path = require('path');
var server = express();
var cookieParser = require('cookie-parser')
var bodyParser = require('body-parser');
var _ = require('lodash');
var q = require('q');
var path = require('path');
var auth = require('./auth');

var syntax = require('./syntax');

var jsonParse = bodyParser.json();
var rawParse = bodyParser.raw({type: "*/*", limit: '4000kb'});

let ipAddrList = _.drop(process.argv, 2); 
var db = require('./db').mk(ipAddrList);
var model = require('./model').mk(db);

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

  model.getUser(body.username).then(user => {
    if (user) {
      return next("username already exists");
    } else {
      let hashedPass = auth.hashPassword(body.password);
      return model.insertUser({username: body.username, fullName: body.fullName, hashedPass: hashedPass});
    }
  }).then(() => {
    return model.getUser(body.username); 
  }).then(user => {
    //send back auth tokens
    let cookieToken = auth.cookieAuth.mkToken(user.username);
    res.cookie(auth.cookieName, cookieToken, {httpOnly: true});

    let bearerToken = auth.bearerAuth.mkToken(user.username);
    res.json({token: bearerToken});
  }).catch(next);

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

  model.getUser(body.username).then(user => {
    console.log("user: " + JSON.stringify(user));
    if (!auth.verifyPassword(user.hashedPass, body.password)) {
      next("username or password does not match our records.");
    }

    //send back auth tokens
    let cookieToken = auth.cookieAuth.mkToken(user.username);
    res.cookie(auth.cookieName, cookieToken, {httpOnly: true});

    let bearerToken = auth.bearerAuth.mkToken(user.username);
    res.json({token: bearerToken});
  }).catch(next);

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
  if (username) {
    q.all([
      model.getUser(username),
      model.getFollow(username), 
      model.getFollowByFollowee(username)
    ]).spread((user, follows1, follows2) => {
      let followees = _.map(_.filter(follows1, r => r.status == 'active'), r => r.followee);
      let pendingFollowees = _.map(_.filter(follows1, r => r.status == 'pending'), r => r.followee);

      let followers = _.map(_.filter(follows2, r => r.status == 'active'), r => r.follower);
      let pendingFollowers = _.map(_.filter(follows2, r => r.status == 'pending'), r => r.follower);

      res.json({user: _.assign(_.omit(user, 'hashedPass'), {
        followees: followees,
        pendingFollowees: pendingFollowees,
        followers: followers,
        pendingFollowers: pendingFollowers
      })});
    }).catch(next);
  } else {
    res.json({user: null});
  }
});

server.get("/profile", jsonParse, (req, res, next) => {
  let query = req.query;
  let bearerToken = bearerTokenFromReq(req);
  let username = auth.bearerAuth.username(bearerToken)
  if (username && (username == query.username || true)){
    model.getProfile(query.username, username).then(profile => {
      res.json({profile: profile});
    }).catch(next);
  } else {
    res.json({profile: null});
  }
});

server.post("/follow", jsonParse, (req, res, next) => {

  let bearerToken = bearerTokenFromReq(req);
  let username = auth.bearerAuth.username(bearerToken)
  var body = req.body;

  
  q.all([
    model.getUser(username), 
    model.getUser(body.followee)
  ]).spread((follower, followee) => {
    if (!follower) {
      return next("user must be logged in");
    }
    if (!followee) {
      return next("followee does not exist");
    }

    if (follower.username == followee.username) {
      return next("logged in user must be different from followee");
    }

    return model.insertFollow(follower.username, followee.username);
  }).then(() => res.json({})).catch(next);

});

server.post("/unfollow", jsonParse, (req, res, next) => {

  let bearerToken = bearerTokenFromReq(req);
  let username = auth.bearerAuth.username(bearerToken)
  var body = req.body;

  q.all([
    model.getUser(username),
    model.getUser(body.followee)
  ]).spread((follower, followee) => {
    if (!follower) {
      return next("user must be logged in");
    }
    if (!followee) {
      return next("followee does not exist");
    }

    if (follower.username == followee.username) {
      return next("logged in user must be different from followee");
    }

    return model.removeFollow(follower.username, followee.username);
  }).then(() => res.json({})).catch(next);

});


server.post("/acceptFollower", jsonParse, (req, res, next) => {

  let bearerToken = bearerTokenFromReq(req);
  let username = auth.bearerAuth.username(bearerToken)
  var body = req.body;

  q.all([
    model.getUser(username),
    model.getUser(body.follower)
  ]).spread((followee, follower) => {

    if (!followee) {
      return next("user must be logged in");
    }
    if (!follower) {
      return next("follower does not exist");
    }

    if (follower.username == followee.username) {
      return next("logged in user must be different from followee");
    }

    return model.activateFollow(follower.username, followee.username);
  }).then(() => res.json({})).catch(next);

});

server.post("/removeFollower", jsonParse, (req, res, next) => {

  let bearerToken = bearerTokenFromReq(req);
  let username = auth.bearerAuth.username(bearerToken)
  var body = req.body;

  q.all([
    model.getUser(username),
    model.getUser(body.follower)
  ]).spread((followee, follower) => {
    if (!followee) {
      return next("user must be logged in");
    }

    if (!follower) {
      return next("follower does not exist");
    }

    if (follower.username == followee.username) {
      return next("logged in user must be different from followee");
    }

    return model.removeFollow(follower.username, followee.username);
  }).then(() => res.json({})).catch(next);

});


server.post("/deletepic", jsonParse, (req, res, next) => {
  let bearerToken = bearerTokenFromReq(req);
  let username = auth.bearerAuth.username(bearerToken)
  model.getUser(username).then(user => {;
    if (!user) {
      return next("user must be logged in");
    }
    return model.deleteUserPic(username);
  }).then(() => res.json({})).catch(next);
});



server.put("/picture", rawParse, function(req, res, next) {

  let bearerToken = bearerTokenFromReq(req);
  let username = auth.bearerAuth.username(bearerToken)
  model.getUser(username).then(user => {;
    if (!user) {
      return next("user must be logged in");
    }

    let data = req.body;
    return model.updateUserPic(username, data);
  }).then(() => res.json({})).catch(next);

});

server.post("/note", jsonParse, (req, res, next) => {
  let bearerToken = bearerTokenFromReq(req);
  let username = auth.bearerAuth.username(bearerToken)
  let body = req.body;
  let profileId = body.profileId;
  let textBody = body.textBody;



  q.all([
    model.getUser(username),
    model.getFollow(username)
  ]).spread((user, follows) => {

    let follow = _.find(follows, r => r.followee == profileId);
    if (!user) {
      return next("user must be logged in");
    }
    console.log("follow: " + JSON.stringify(follow));
    if ((username != profileId) && (!follow || follow.status != 'active')) {
      return next("user must be the profile's user or be a follower of profile's user");
    } 

    return model.insertNote({profileId: profileId, textBody: textBody, author: username});
  }).then(() => res.json({})).catch(next);

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
