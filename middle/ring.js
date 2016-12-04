'use strict';
var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

let mk = keys => {

  let hash = key => (crypto.createHash('sha256').update(key).digest());


  let hashKeyMap = _.fromPairs(_.map(keys, k => {
    let hashV = hash(k);
    return [hashV, k];
  }));

  let sortedHashVs = _.sortBy(_.keys(hashKeyMap));


  let get = key => {
    let hashV = hash(key);
    let i = _.sortedIndex(sortedHashVs, hashV);
    let r = i %  _.size(sortedHashVs);
    return hashKeyMap[sortedHashVs[r]];
  };

  return {
    get: get
  };
}; 

module.exports.mk = mk;
