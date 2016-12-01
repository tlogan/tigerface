'use strict';
var _ = require('lodash');
var fs = require('fs');
var path = require('path');

var syntax = require('./syntax');
var bigTable = []; //simply a list of records, where each record has a family field (aka table);

let insert = ((family, attrs) => {
  if (syntax.hasFamilySyntax(family)) {

    bigTable = _.concat(bigTable, [_.assign(attrs, {family: family})]);

    return true;
  } else {
    return false;
  } 

});


let insertUser = (user => {
  return insert('user', user);
});

let insertNote = (note => {
  return insert('note', note);
});


let getUser = (username => { 
  return _.find(bigTable, r => r.family == 'user' && r.username == username);
});

let getFollow = (follower => { 
  return _.filter(bigTable, r => r.family == 'follow' && r.follower == follower);
});

let getProfile = ((profileUsername, reqUsername) => {
  let profileUser = getUser(profileUsername);
  let follow = _.find(getFollow(reqUsername), follow => (follow.followee == profileUsername));  
  let notes = _.reverse(_.filter(bigTable, r => ((r.family == 'note') && (r.profileId == profileUsername))));

  return {
    user: _.omit(profileUser, 'hashedPass'),
    followStatus: follow && follow.status,
    notes: notes
  };

});

let insertFollow = (follower, followee) => {
  return insert('follow', {follower: follower, followee: followee, status: 'pending'});
};


let removeFollow = (follower, followee) => {
  bigTable = _.filter(bigTable, r => (!(r.family == 'follow' && r.follower == follower && r.followee == followee)));
  return true;
};


let deleteUserPic = username => {
  let file = path.resolve(__dirname + '/../front/pics/' + username + '.jpg');
  bigTable = _.map(bigTable, r => {
    if (r.family == 'user' && r.username == username) {
      return _.omit(r, 'picture');
    } else {
      return r;
    }
  });
  fs.unlinkSync(file);
};

let updateUserPic = (username, data) => {
  let picUrl = '/pics/' + username + '.jpg';
  let file = path.resolve(__dirname + '/../front' + picUrl);
  bigTable = _.map(bigTable, r => {
    if (r.family == 'user' && r.username == username) {
      return _.assign(r, {picture: picUrl});
    } else {
      return r;
    }
  });
  try {
    fs.writeFileSync(file, data);
    console.log("new picture written");
  } catch(err) {
    console.log(err);
  }
};

let tigerfaceFile = path.resolve(__dirname + '/../tigerface.json');

let save = (() => {
  try {
    fs.writeFileSync(tigerfaceFile, JSON.stringify(bigTable));
    console.log("saved data");
  } catch(err) {
    console.log(err);
  }
});


let load = (() => {
  try {
    let data = fs.readFileSync(tigerfaceFile, 'utf8');
    bigTable = JSON.parse(data);
    console.log("loaded data");
  } catch(err) {
    console.log(err);
  }
});


module.exports.insert = insert;

module.exports.insertUser = insertUser;
module.exports.getUser = getUser;

module.exports.getProfile = getProfile;

module.exports.insertFollow = insertFollow;
module.exports.removeFollow = removeFollow;
module.exports.deleteUserPic = deleteUserPic;
module.exports.updateUserPic = updateUserPic;
module.exports.insertNote = insertNote;

module.exports.save = save;
module.exports.load = load;
