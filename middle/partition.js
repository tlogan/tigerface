'use strict';
var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var request = require('request');

let mk = ipAddress => {

  let http = (url, reqBody) => {
    let result = null;
    q.spawn(function* () {
      var df = q.defer();
      request({
        method: 'post',
        uri: ipAddress + "/" + url,
        body: reqBody,
        json: true 
      }, (error, response, resBody) => {
        if (!error) {
          if (response.statusCode == 200) {
            df.resolve(resBody);
          } else {
            df.reject(resBody);
          }
        } else {
          df.reject(resBody.errors);
        }
      }); 
      result = yield df.promise;
      console.log("http result: " + JSON.stringify(result));
    });
    return result;
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

  let remove = (filter) => {
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
