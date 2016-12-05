'use strict';
var _ = require('lodash');
var fs = require('fs');
var path = require('path');

var syntax = require('./syntax');
var partition = require('./partition');
var q = require('q');

var ring = require('./ring')

let mk = ipAddrList => {
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

  let update = (set, filter, env, index) => {
    let parts = getPartitionsByIndex(index);
    _.each(parts, p => {
      p.update(set, filter, env);
    });
  };

  //map: object -> list of object 
  //reduce: (k, v, v) -> v 
  ///
  //get: (->, ->) -> list of object
  let get = (map, reduce, env, index) => {

    let parts = getPartitionsByIndex(index);
    let partsSize = _.size(parts);

    let loop = ps => {
      let groups = _.map(_.groupBy(ps, p => p.k), (ps, k) => ({k: k, vs: _.map(ps, p => p.v)}));

      let newPairsP = q.all(_.map(groups, (g, i) => {
        let part = parts[i % partsSize];
        return part.reduce(reduce, g.k, g.vs, env);
      })).then(_.flatten);

      return newPairsP.then(newPairs => {

        //if there are no more duplicate keys then stop; otherwise reduce again 
        if (_.size(_.uniq(_.map(newPairs, p => p.k))) <= _.size(newPairs)) {
          return newPairs;
        } else {
          return loop(newPairs);
        }
      });
    };

    let pairsP = q.all(_.map(parts, part => part.flatMap(map, env))).then(_.flatten);
    return pairsP.then(pairs => 
      loop(pairs)
    ).then(newPairs =>
      _.fromPairs(_.map(newPairs, p => ([p.k, p.v])))
    );

  };


  let remove = (filter, env, index) => {
    let parts = getPartitionsByIndex(index);
    _.each(parts, p => {
      p.remove(filter, env);
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

  return {
    insert: insert,
    update: update,
    get: get,
    remove: remove,
    save: save,
    load: load
  };
}

module.exports.mk = mk;
