'use strict';
var _ = require('lodash');
var fs = require('fs');
var path = require('path');

let mk = db => {

  let insertUser = (user => {
    return db.insert('user', user, user.username);
  });

  let insertNote = (note => {
    return db.insert('note', note, note.profileId);
  });


  let getUser = (username => { 

    console.log("getting user from db: " + db);
    let kvObject = db.get(
      (r, env) => r.family == 'user' && r.username == env.username ? [ {k: env.username, v: r} ] : [],
      (k, vs) => [{k: k, v: vs}],
      {username: username},
      username
    );
    let userList = kvObject[username];

    return _.size(userList) > 0 && userList[0];
  });


  let insertFollow = (follower, followee) => {
    return db.insert('follow', {follower: follower, followee: followee, status: 'pending'}, follower);
  };

  let removeFollow = (follower, followee) => {
    db.remove((r, env) => (r.family == 'follow' && r.follower == env.follower && r.followee == env.followee), {
      follower: follower,
      followee: followee
    }, follower);
    return true;
  };

  let getFollow = (follower => { 
    let kvObject = db.get(
      (r, env) => r.family == 'follow' && r.follower == env.follower ? [ {k: env.follower, v: r} ] : [],
      (k, vs) => [{k: k, v: vs}],
      {follower: follwer},
      follower
    );
    let followList = kvObject[follower];
    return _.size(followList) > 0 && followList;
  });

  let getFollowByFollowee = followee => { 
    let kvObject = db.get(
      (r, env) => r.family == 'follow' && r.followee == env.followee ? [ {k: env.followee, v: r} ] : [],
      (k, vs) => [{k: k, v: vs}],
      {followee: followee}
    );
    let followList = kvObject[followee];

    return _.size(followList) > 0 && followList;
  };


  //join together follows and notes using db mapReduce api
  //
  //should be equivalent to pseuodo sql:
  //select * 
  //and note.profileId = profileUsername
  //and (
  //   (note.author == requUsername) 
  //   or  (follow.follwer == reqUsername and follow.followee == note.author)
  //)
  let getNotes = (profileUsername, reqUsername) => {
    let map = (r, env) => {
      if (r.family == 'note' && r.profileId == env.profileUsername) {
        return [ {k: r.author, v: r} ];
      } else if (r.family == 'follow' && r.follower == env.reqUsername) {
        return [ {k: r.followee, v: r} ];
      } else {
        return [];
      }
    };

    let reduce = (k, vs, env) => {
        let notes = _.filter(vs, v => v.family == 'note');
        let follows = _.filter(vs, v => v.family == 'follow');

        let filtNotes = _.filter(notes, n => (
          n.author == env.reqUsername || _.find(follows, f => n.author == f.followee)
        ));

        return _.map(filtNotes, un => ({k: k, v: filtNotes}));
    };

    let kvObject = db.get(map, reduce, {
      profileUsername: profileUsername, 
      reqUsername: reqUsername
    });
    return _.flatten(_.values(kvObject));
  };

  let getProfile = (profileUsername, reqUsername) => {
    let user = getUser(profileUsername);
    let notes = _.reverse(getNotes(profileUsername, reqUsername));
    let follow = _.find(getFollow(reqUsername), follow => (follow.followee == profileUsername));  

    return {
      user: user,
      followStatus: follow && follow.status,
      notes: notes
    };
  };

  let activateFollow = (follower, followee) => {
    db.update(
      r => _.assign(r, {status: 'active'}), 
      r => r.family == 'follow' && r.follower == follower && r.followee == followee,
      follower
    );
    return true;
  };



  let deleteUserPic = username => {
    db.update((r, env) => _.omit(r, 'picture'), r => r.family == 'user' && r.username == env.username, {
      username: username
    }, username);
    let file = path.resolve(__dirname + '/../front/pics/' + username + '.jpg');
    fs.unlinkSync(file);
  };

  let updateUserPic = (username, data) => {
    let picUrl = '/pics/' + username + '.jpg';
    db.update((r, env) => _.assign(r, {picture: picUrl}), r => r.family == 'user' && r.username == env.username, {
      username: username
    }, username);

    let file = path.resolve(__dirname + '/../front' + picUrl);
    try {
      fs.writeFileSync(file, data);
      console.log("new picture written");
    } catch(err) {
      console.log(err);
    }
  };


  return {
    insertUser: insertUser,
    getUser: getUser,
    getProfile: getProfile,
    insertFollow: insertFollow,
    removeFollow: removeFollow,
    activateFollow: activateFollow,
    deleteUserPic: deleteUserPic,
    updateUserPic: updateUserPic,
    insertNote: insertNote,
    getFollow: getFollow,
    getFollowByFollowee: getFollowByFollowee
  };

}; 

module.exports.mk = mk;
