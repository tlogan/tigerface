"use strict";

function mkState() {

  var handlers = {};
  var state = {};

  function addHandler(name, funcMap) {
    handlers = _.assign(handlers, _.fromPairs([[name, funcMap]]));
    _.forEach(funcMap, function(f, key) {
      if (_.has(state, key)) {
        f(state[key]);
      }
    });
  }

  function removeHandler(name) {
    handlers = _.omit(handlers, name);
  };

  function removeAllBut(name) {
    handlers = (handlers && handlers[name]) ? _.fromPairs([[name, handlers[name]]]) : {};
  };

  function update(key, val) {
    state = _.assign(state, _.fromPairs([[key, val]]));
    _.forEach(handlers, function(funcMap) {
      if (funcMap[key]) {
        funcMap[key](val);
      }
    });
  };

  function has(key) {
    return _.has(state, key);
  };

  function get(key) {
    return _.cloneDeep(state[key]);
  };

  function keys() {
    return _.keys(state);
  };

  return {
    addHandler: addHandler,
    removeHandler: removeHandler,
    removeAllBut: removeAllBut,
    update: update,
    has: has,
    get: get,
    keys: keys
  };

}
