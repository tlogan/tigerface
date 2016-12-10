'use strict';
var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var q = require('q');

let mk = db => {

  let insertUser = (user => {
    return db.insert('user', user, user.username);
  });

  let insertNote = (note => {
    return db.insert('note', note, note.profileId);
  });


  let getUser = (username => { 
    return db.get(
      (r, env) => r.family == 'user' && r.username == env.username ? [ {k: env.username, v: r} ] : [],
      (k, vs, env) => [{k: k, v: vs}],
      {username: username},
      username
    ).then(kvObject => {
      let userList = kvObject[username];
      return _.size(userList) > 0 && userList[0];
    });
  });

  let getSuggestions = (username => { 

    let map = (r, env) => {
      if (r.family == 'user' && r.username != env.username) {
        return [ {k: r.username, v: r} ];
      } else if (r.family == 'follow' && (r.follower == env.username)) {
        return [ {k: r.followee, v: 'exclude'} ];
      } else if (r.family == 'follow' && (r.followee == env.username)) {
        return [ {k: r.follower, v: 'exclude'} ];
      } else {
        return [];
      }
    };

    let reduce = (k, vs, env) => {
      let excludes = _.filter(vs, v => v == 'exclude');
      if (_.size(excludes) > 0) {
        return [];
      } else {
        return [{k: k, v: vs}];
      }
    };

    return db.get(map, reduce, {
      username: username, 
    }).then(kvObject => _.flatten(_.values(kvObject)));

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
    return db.get(
      (r, env) => r.family == 'follow' && r.follower == env.follower ? [ {k: env.follower, v: r} ] : [],
      (k, vs) => [{k: k, v: vs}],
      {follower: follower},
      follower
    ).then(kvObject => {
      let followList = kvObject[follower];
      return _.size(followList) > 0 && followList;
    });
  });

  let getFollowByFollowee = followee => { 
    return db.get(
      (r, env) => r.family == 'follow' && r.followee == env.followee ? [ {k: env.followee, v: r} ] : [],
      (k, vs) => [{k: k, v: vs}],
      {followee: followee}
    ).then(kvObject => {
      let followList = kvObject[followee];
      return _.size(followList) > 0 && followList;
    });
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
          n.author == env.reqUsername || _.find(follows, f => n.author == f.followee && f.status == 'active')
        ));

        return _.map(filtNotes, un => ({k: k, v: filtNotes}));
    };

    return db.get(map, reduce, {
      profileUsername: profileUsername, 
      reqUsername: reqUsername
    }).then(kvObject => _.flatten(_.values(kvObject)));
  };

  let getProfile = (profileUsername, reqUsername) => {
    return q.all([
      getUser(profileUsername),
      getNotes(profileUsername, reqUsername),
      getFollow(reqUsername)
    ]).spread((user, notes, follows) => {
      if (user) {
        let follow = _.find(follows, follow => (follow.followee == profileUsername));  
        return {
          user: user,
          followStatus: follow && follow.status,
          notes: _.reverse(notes),
        };
      } else {
        return q.fcall(() => null);
      }
    });
  };

  let activateFollow = (follower, followee) => {
    return db.update(
      (r, env) => _.assign(r, {status: 'active'}), 
      (r, env) => r.family == 'follow' && r.follower == env.follower && r.followee == env.followee,
      {
        follower: follower,
        followee: followee,
      },
      follower
    );
  };


  let deleteUserPic = username => {
    db.update((r, env) => _.omit(r, 'picture'), (r, env) => r.family == 'user' && r.username == env.username, {
      username: username
    }, username);
    let file = path.resolve(__dirname + '/../front/pics/' + username + '.jpg');
    fs.unlinkSync(file);
    return {};
  };

  let updateUserPic = (username, data) => {
    let picUrl = '/pics/' + username + '.jpg';
    db.update((r, env) => _.assign(r, {picture: env.picUrl}), (r, env) => r.family == 'user' && r.username == env.username, {
      username: username,
      picUrl: picUrl
    }, username);

    let file = path.resolve(__dirname + '/../front' + picUrl);
    try {
      fs.writeFileSync(file, data);
      console.log("new picture written");
    } catch(err) {
      console.log(err);
    }
    return {};
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
    getFollowByFollowee: getFollowByFollowee,
    getSuggestions: getSuggestions
  };

}; 

module.exports.mk = mk;
