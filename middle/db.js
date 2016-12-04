'use strict';
var _ = require('lodash');
var fs = require('fs');
var path = require('path');

var syntax = require('./syntax');
var partition = require('./partition');

var ring = require('./ring')
var ipAddrList = ["one", "two", "three", "four"]; 
var ipRing = ring.mk(ipAddrList);
var partitionMap = _.fromPairs(_.map(ipAddrList, ipAddr => [ipAddr, partition.mk(ipAddr)]));

let getPartitionsByIndex = index => {
  if (index) {
    console.log("index: " + index);
    let ipAddr = ipRing.get(index);
    console.log("found ipAddr: " + ipAddr);
    return [partitionMap[ipAddr]];
  } else {
    return _.values(partitionMap);
  }
}

let insert = (family, attrs, index) => {
  let parts = getPartitionsByIndex(index);
  if (syntax.hasFamilySyntax(family)) {
    let r = Math.floor(Math.random() * _.size(parts));
    return parts[r].insert(family, attrs);
  } else {
    return false;
  } 
};

let update = (set, filter, index) => {
  let parts = getPartitionsByIndex(index);
  _.each(parts, p => {
    p.update(set, filter);
  });
};

//map: object -> list of object 
//reduce: (k, v, v) -> v 
///
//get: (->, ->) -> list of object
let get = (map, reduce, index) => {

  let parts = getPartitionsByIndex(index);
  let partsSize = _.size(parts);

  let pairs = _.flatMap(parts, p => p.flatMap(map));


  let loop = ps => {
    let groups = _.map(_.groupBy(ps, p => p.k), (ps, k) => ({k: k, vs: _.map(ps, p => p.v)}));

    let newPairs = _.flatMap(groups, (g, i) => {
      let part = parts[i % partsSize];
      return part.reduce(reduce, g.k, g.vs);
    });

    //if there are no more duplicate keys then stop; otherwise reduce again 
    if (_.size(_.uniq(_.map(newPairs, p => p.k))) <= _.size(newPairs)) {
      return newPairs;
    } else {
      loop(newPairs);
    }
  }

  let newPairs = loop(pairs);
  let o =  _.fromPairs(_.map(newPairs, p => ([p.k, p.v])));
  return o;

};


let remove = (filter, index) => {
  let parts = getPartitionsByIndex(index);
  _.each(parts, p => {
    p.remove(filter);
  });
};


let save = index => {
  let parts = getPartitionsByIndex(index);
  _.each(parts, p => {
    p.save();
  });
};


let load = index => {
  let parts = getPartitionsByIndex(index);
  _.each(parts, p => {
    p.load();
  });
};


module.exports.insert = insert;
module.exports.update = update;
module.exports.get = get;
module.exports.remove = remove;

module.exports.save = save;
module.exports.load = load;
