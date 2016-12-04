'use strict';
var _ = require('lodash');
var fs = require('fs');
var path = require('path');

let mk = db => {

  let insertUser = (user => {
    return db.insert('user', user);
  });

  let insertNote = (note => {
    return db.insert('note', note);
  });


  let getUser = (username => { 

    let kvObject = db.get(
      r => r.family == 'user' && r.username == username ? [ {k: username, v: r} ] : [],
      (k, vs) => [{k: k, v: vs}]
    );
    let userList = kvObject[username];

    return _.size(userList) > 0 && userList[0];
  });

  let getFollow = (follower => { 

    let kvObject = db.get(
      r => r.family == 'follow' && r.follower == follower ? [ {k: follower, v: r} ] : [],
      (k, vs) => [{k: k, v: vs}]
    );
    let followList = kvObject[follower];

    return _.size(followList) > 0 && followList;
  });

  let getFollowByFollowee = followee => { 
    let kvObject = db.get(
      r => r.family == 'follow' && r.followee == followee ? [ {k: followee, v: r} ] : [],
      (k, vs) => [{k: k, v: vs}]
    );
    let followList = kvObject[followee];

    return _.size(followList) > 0 && followList;
  };


  //join together follows, and notes using db mapReduce api
  //
  //should be equivalent to pseuodo sql:
  //select * 
  //and note.profileId = profileUsername
  //and (
  //   (note.author == requUsername) 
  //   or  (follow.follwer == reqUsername and follow.followee == note.author)
  //)
  let getNotes = (profileUsername, reqUsername) => {
    let map = r => {
      if (r.family == 'note' && r.profileId == profileUsername) {
        return [ {k: r.author, v: r} ];
      } else if (r.family == 'follow' && r.follower == reqUsername) {
        return [ {k: r.followee, v: r} ];
      } else {
        return [];
      }
    };

    let reduce = (k, vs) => {
        let notes = _.filter(vs, v => v.family == 'note');
        let follows = _.filter(vs, v => v.family == 'follow');

        let filtNotes = _.filter(notes, n => (
          n.author == reqUsername || _.find(follows, f => n.author == f.followee)
        ));

        return _.map(filtNotes, un => ({k: k, v: filtNotes}));

    };

    let kvObject = db.get(map, reduce);
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

  let insertFollow = (follower, followee) => {
    return db.insert('follow', {follower: follower, followee: followee, status: 'pending'});
  };

  let removeFollow = (follower, followee) => {
    db.remove(r => (r.family == 'follow' && r.follower == follower && r.followee == followee));
    return true;
  };

  let activateFollow = (follower, followee) => {
    db.update(
      r => _.assign(r, {status: 'active'}), 
      r =>r.family == 'follow' && r.follower == follower && r.followee == followee
    );
    return true;
  };



  let deleteUserPic = username => {
    db.update(r => _.omit(r, 'picture'), r => r.family == 'user' && r.username == username);
    let file = path.resolve(__dirname + '/../front/pics/' + username + '.jpg');
    fs.unlinkSync(file);
  };

  let updateUserPic = (username, data) => {
    let picUrl = '/pics/' + username + '.jpg';
    db.update(r => _.assign(r, {picture: picUrl}), r => r.family == 'user' && r.username == username);

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
