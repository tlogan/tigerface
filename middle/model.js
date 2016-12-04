'use strict';

let mk = db => {

  let insertUser = (user => {
    return db.insert('user', user);
  });

  let insertNote = (note => {
    return db.insert('note', note);
  });


  let getUser = (username => { 

    let kvObject = db.get(
      r => r.family == 'user' && r.username == username ? [ [{k: username, v: r}] ] : [],
      (k, acc, v) => _.concat(acc, v),
    );
    let userList = kvObject[username];

    return _.size(userList) > 0 && userList[0] && userList[0].v;
  });

  let getFollow = (follower => { 

    let kvObject = db.get(
      r => r.family == 'follow' && r.follower == follower ? [ {k: follower, v: r} ] : [],
      (k, vs) => [{k: k, v: vs}]
    );
    let followList = kvObject[follower];

    return _.size(followList) > 0 && _.map(followList, p => p.v);
  });

  let getFollowByFollowee = followee => { 
    let kvObject = db.get(
      r => r.family == 'follow' && r.followee == followee ? [ {k: followee, v: r} ] : [],
      (k, vs) => [{k: k, v: vs}]
    );
    let followList = kvObject[followee];

    return _.size(followList) > 0 && _.map(followList, p => p.v);
  };



  //join together users, follows, and notes using db mapReduce api
  //
  //should be equivalent to pseuodo sql:
  //select * 
  //from user, follow, note
  //where user.username = profileUsername
  //and note.profileId = profileUsername
  //and (
  //   (note.author == requUsername) 
  //   or  (follow.follwer == reqUsername and follow.followee == note.author)
  //)
  let getProfile = (profileUsername, reqUsername) => {
    let map = r => {
      if (r.family == 'user' && r.username == profileUsername) {
        return [ {k: 'p-' + profileUsername, v: r} ];
      } else if (r.family == 'note' && r.profileId == profileUsername) {
        return [ {k: 'p-' + profileUsername, v: r} ];
      } else if (r.family == 'follow' && r.follower == reqUsername) {
        return [ {k: 'r-' + reqUsername, v: r} ];
      } else {
        return [];
      }
    };

    let reduce = (k, vs) => {
      if (_.startsWith(k, 'p-')) {
        let users = _.map(vs, v => v.family == 'user');
        let notes = _.map(vs, v => v.family == 'notes');

        let userNotes = (
          _.flatMap(users, u => _.map(notes, n => 
            {family: 'user-note', user: u, note: n};
          ))
        );

        return _.map(userNotes, un => {k: 'r-' + un.note.author, v: un});

      } else (_.startsWith(k, 'r-')){

        let userNotes = _.map(vs, v => v.family == 'user-note');
        let follows = _.map(vs, v => v.family == 'follow');
        let filtUserNotes = _.filter(userNotes, un => (
          un.note.author == reqUsername || _.find(follows, f => f.follower == reqUsername && f.followee == un.note.author)
        ));  

        return _.map(filterUserNotes, un => {k: u.username, v: un});

      } else {
        let users = _.map(vs, v => v.user);
        let notes = _.map(vs, v => v.note);
        return [{k: k, v: {user: users[0], notes: notes}}];
      }
    };

    let kvObject = db.get(map, reduce);
    let userWithNotes = kvObject[profileUsername];


    let follow = _.find(getFollow(reqUsername), follow => (follow.followee == profileUsername));  

    return {
      user: _.omit(userWithNotes.user, 'hashedPass'),
      followStatus: follow && follow.status,
      notes: userWithNotes.notes
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
    db.update(r => _.omit(r, 'picture'), r.family == 'user' && r.username == username);
    let file = path.resolve(__dirname + '/../front/pics/' + username + '.jpg');
    fs.unlinkSync(file);
  };

  let updateUserPic = (username, data) => {
    let picUrl = '/pics/' + username + '.jpg';
    db.update(r => _.assign(r, {picture: picUrl}), r.family == 'user' && r.username == username);

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
