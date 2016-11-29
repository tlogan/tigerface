'use strict';
var _ = require('lodash');
var fs = require('fs');
var path = require('path');

var syntax = require('./syntax');
var bigTable = {};

let insert = ((family, index, attrs) => {

  if (syntax.hasFamilySyntax(family) && syntax.hasIndexSyntax(index)) {

    if (_.has(bigTable, family)) {
      bigTable = _.map(bigTable, (familyTable, familyKey) => {
        if (familyKey == family) {
          return _.assign(familyTable, _.fromPairs([
            [index, attrs] 
          ]));
        } else {
          return familyTable;
        }
      });
    } else {
      bigTable = _.assign(bigTable, _.fromPairs([
        [family, _.fromPairs([[index, attrs]])]
      ]));
    }
  
    return true;
  } else {
    return false;
  } 

});

let get = ((family, index) => bigTable[family][index]);

let insertUser = (user => {
  return insert('user', user.username, user);
});

let getUser = (index => get('user', index));

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
module.exports.get = get;

module.exports.insertUser = insertUser;
module.exports.getUser = getUser;

module.exports.save = save;
module.exports.load = load;
