'use strict';
var _ = require('lodash');

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
  console.log("bigTable: " + JSON.stringify(bigTable));
});

let getUser = (index => get('user', index));

module.exports.insert = insert;
module.exports.get = get;

module.exports.insertUser = insertUser;
module.exports.getUser = getUser;
