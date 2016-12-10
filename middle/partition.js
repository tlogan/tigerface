'use strict';
var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var request = require('request');
var q = require('q');

let mk = (ipAddress, backupIpAddress) => {


  var fault = false;

  let randAddr = () => ((Math.random() * 10) < 5 ? ipAddress : backupIpAddress)

  let httpGen = (addr) => (shortUrl, reqBody) => {
    let url = "http://" + addr + "/" + shortUrl;
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
        if (ipAddress == addr && err.code == "ECONNREFUSED") {
          fault = true;
        }
        df.reject(err);
      }
    });
    return df.promise;
  };

  let http = httpGen(ipAddress);
  let httpBackup = httpGen(backupIpAddress);

  let httpWrite = (family, attrs) => {
    if (fault) {
      return httpBackup(family, attrs);
    } else {
      httpBackup(family, attrs);
      return http(family, attrs);
    }
  }

  let httpRead = (family, attrs) => fault ? httpBackup(family, attrs) : httpGen(randAddr())(family, attrs)

  let insert = (family, attrs) => {
    return httpWrite('insert', {family: family, attrs: attrs});
  }

  let update = (set, filter, env) => {
    return httpWrite('update', {set: set + "", filter: filter + "", env: env});
  };

  let flatMap = (f, env) => {
    return httpRead('flatMap', {f: f + "", env: env});
  };

  let reduce = (f, k, vs, env) => {
    return httpRead('reduce', {f: f + "", k: k, vs: vs, env: env});
  };

  let remove = (filter, env) => {
    return httpWrite('remove', {filter: filter + "", env: env});
  };

  let save = () => {
    return httpWrite('save', {});
  };

  let load = () => {
    return httpRead('load', {});
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
