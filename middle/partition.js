'use strict';
var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var request = require('request');
var q = require('q');

let mk = ipAddress => {

  let http = (shortUrl, reqBody) => {
    let url = "http://" + ipAddress + "/" + shortUrl;
    var df = q.defer();
    request({
      method: 'post',
      url: url,
      json: true,
      body: reqBody
    },function (err, response, body) {
      if (!err) {
        if (response.statusCode == 200) {
          df.resolve(body);
        } else {
          df.reject(body);
        }
      } else {
        df.reject(body.errors || err);
      }
    });
    return df.promise;
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
