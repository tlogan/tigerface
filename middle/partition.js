'use strict';
var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var request = require('sync-request');

let mk = ipAddress => {

  let http = (url, reqBody) => {
    let uri = "http://" + ipAddress + "/" + url;
    console.log("uri: " + uri);
    let response = request('POST', uri, {json: reqBody});
    try {
      let parsed =  JSON.parse(response.getBody('utf8'));
      return parsed;
    } catch(err) {
      return null;
    }
  };

  let insert = (family, attrs) => {
    return http('insert', {family: family, attrs: attrs});
  }

  let update = (set, filter, env) => {
    return http('update', {set: set + "", filter: filter + "", env: env});
  };

  let flatMap = (f, env) => {
    return http('flatMap', {f: f + "", env: env});
  };

  let reduce = (f, k, vs, env) => {
    return http('reduce', {f: f + "", k: k, vs: vs, env: env});
  };

  let remove = (filter, env) => {
    return http('remove', {filter: filter + "", env: env});
  };

  let save = () => {
    return http('save', {});
  };

  let load = () => {
    return http('load', {});
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
