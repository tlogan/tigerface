'use strict';
var _ = require('lodash');
var fs = require('fs');
var path = require('path');


let mk = ipAddress => {

  var bigTable = []; //simply a list of records, where each record has a family field (aka table);

  let insert = (family, attrs) => {
    bigTable = _.concat(bigTable, [_.assign(attrs, {family: family})]);
    return true;
  }

  let update = (set, filter) => {
    bigTable = _.map(bigTable, r => {
      if (filter(r)) {
        return set(r);
      } else {
        return r;
      }
    });
  };

  let flatMap = f => {
    return _.flatMap(bigTable, f); 
  };

  let reduce = (f, k, vs) => {
    return f(k, vs);
  };

  let remove = (filter) => {
    bigTable = _.filter(bigTable, r => !filter(r));
    return true;
  };

  let tigerfaceFile = path.resolve(__dirname + '/../tigerface_' + ipAddress + '.json');

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
