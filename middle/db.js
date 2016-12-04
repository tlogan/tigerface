'use strict';
var _ = require('lodash');
var fs = require('fs');
var path = require('path');

var syntax = require('./syntax');
var bigTable = []; //simply a list of records, where each record has a family field (aka table);

let insert = (family, attrs) => {
  if (syntax.hasFamilySyntax(family)) {
    bigTable = _.concat(bigTable, [_.assign(attrs, {family: family})]);
    return true;
  } else {
    return false;
  } 
};

let update = (set, filter) => {
  bigTable = _.map(bigTable, r => {
    if (filter(r)) {
      return set(r);
    } else {
      return r;
    }
  });
};

//map: object -> list of object 
//reduce: (k, v, v) -> v 
///
//get: (->, ->) -> list of object
let get = (map, reduce) => {
  let pairs = _.flatMap(bigTable, r => map(r)); 

  let loop = ps => {
    let groups = _.groupBy(ps, p => p.k);
    let newPairs = _.flatMap(groups, (ps, k) => {
      let vs = _.map(ps, p => p.v);
      return reduce(k, vs);
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


let remove = filter => {
  bigTable = _.filter(bigTable, r => !filter(r));
  return true;
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
module.exports.update = update;
module.exports.get = get;
module.exports.remove = remove;

module.exports.save = save;
module.exports.load = load;





