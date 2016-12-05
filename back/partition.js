'use strict';
var _ = require('lodash');
var fs = require('fs');
var path = require('path');


let mk = name => {

  let tigerfaceFile = path.resolve(__dirname + '/../tigerface_' + name + '.json');

  var bigTable = []; //simply a list of records, where each record has a family field (aka table);

  let insert = (family, attrs) => {
    bigTable = _.concat(bigTable, [_.assign(attrs, {family: family})]);
    return [];
  }

  let update = (set, filter, env) => {
    bigTable = _.map(bigTable, r => {
      if (filter(r, env)) {
        return set(r, env);
      } else {
        return r;
      }
    });
    return [];
  };

  let flatMap = (f, env) => {
    return _.flatMap(bigTable, r => f(r, env)); 
  };

  let reduce = (f, k, vs, env) => {
    return f(k, vs, env);
  };

  let remove = (filter, env) => {
    bigTable = _.filter(bigTable, r => !filter(r, env));
    return [];
  };

  let save = () => {
    let fd = null;
    try {
      fd = fs.openSync(tigerfaceFile, 'w');
      fs.writeFileSync(fd, JSON.stringify(bigTable, null, 2));
      console.log("saved data");
    } catch(err) {
      console.log(err);
    } finally {
      if (fd != null) {
        fs.closeSync(fd);
      }
    }
    return [];
  };


  let load = () => {
    let fd = null;
    try {
      fd = fs.openSync(tigerfaceFile, 'r');
      let data = fs.readFileSync(fd, 'utf8');
      bigTable = JSON.parse(data);
      console.log("loaded data");
    } catch(err) {
      console.log(err);
    } finally {
      if (fd != null) {
        fs.closeSync(fd);
      }
    }
    return [];
  };


  return {
    insert: insert,
    update: update,
    flatMap: flatMap,
    reduce: reduce,
    remove: remove,
    save: save,
    load: load
  };

};

module.exports.mk = mk;
