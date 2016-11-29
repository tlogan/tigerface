'use strict';
var crypto = require('crypto');
var _ = require('lodash');
var r = require('jsrsasign');

function randomAlphaNumeric(size) {
  var numbers    = '0123456789';
  var charsLower = 'abcdefghijklmnopqrstuvwxyz';
  var charsUpper = charsLower.toUpperCase();
  var charset = numbers + charsLower + charsUpper;
  var bf = crypto.randomBytes(size);
  var string = '';
  for (var value of bf.values()) {
    var charsetIndex = value % charset.length;
    string += charset.charAt(charsetIndex);
  }
  return string;
}

var cookieSecret = randomAlphaNumeric(16);
var bearerSecret = randomAlphaNumeric(16);

var cfg = {
  json: false,
  keyLength: 66,
  workUnits: 60,
  wordKey: 388
};
var baseline = 1000;

function verifyPassword(authData, password) {

  if (!authData) {
    authData = {};
  }
  if (typeof authData === 'string') {
    authData = JSON.parse(authData);
  }
  if (authData.hashMethod && authData.hashMethod !== 'pbkdf2') {
    throw new Error('Unsupported hash method: ' + authData.hashMethod);
  }

  var workUnits = authData.workUnits || cfg.workUnits || 60;
  var workKey = cfg.workKey || 388;
  var bufferEq = require('buffer-equal-constant-time');

  return bufferEq(
    new Buffer(authData.hash || '', 'base64'), 
    new Buffer(crypto.pbkdf2Sync(
      password || '',
      authData.salt || '',
      (baseline + workKey) * workUnits,
      authData.keyLength || cfg.keyLength || 66
    ), 'hex')
  );
}

function hashPassword(password) {
  var salt = randomAlphaNumeric(cfg.keyLength || 66);
  var baseline = 1000;
  var keyLength = cfg.keyLength || 66;
  var workUnits = cfg.workUnits || 60;
  var workKey = cfg.workKey || 388;
  var iterations = (baseline + workKey) * workUnits;
  var data = {
    hash: new Buffer(crypto.pbkdf2Sync(
      password, salt, iterations, keyLength
    ), 'hex').toString('base64'),
    salt: salt,
    keyLength: keyLength,
    hashMethod: 'pbkdf2',
    workUnits: workUnits
  };

  return cfg.json ? JSON.stringify(data) : data;
}

function getHeader(token) {
  return token ? r.jws.JWS.readSafeJSONString(r.b64utoutf8(token.split(".")[0])) : {};
};

function getPayload(token) {
  return token ? r.jws.JWS.readSafeJSONString(r.b64utoutf8(token.split(".")[1])) : {};
}

function mkTokenAuth(secret) {

  var alg = 'HS256';
  var typ = 'JWT';

  function mkUserToken(user, data) {
    var now = r.jws.IntDate.get('now');
    var end = r.jws.IntDate.get('now + 1day');
    var payload = {
      user: user,
      data: data || {},
      iss: "tigerface",
      nbf: now,
      iat: now,
      exp: end 
    };
    var headerString = JSON.stringify({alg: alg, typ: typ});
    var payloadString = JSON.stringify(payload);
    return r.jws.JWS.sign(alg, headerString, payloadString, secret);
  }

  function verifyToken(token) { 
    return token && secret && r.jws.JWS.verifyJWT(token, secret, {alg: [alg]});
  }

  function user(token) {
    if (token && verifyToken(token)) {
      var pl = getPayload(token);
      if (_.has(pl, 'user') && _.has(pl.user, '_id')) {
        return pl.user;
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  return {
    mkUserToken: mkUserToken,
    verifyToken: verifyToken,
    user: user 
  };

}


var bearerAuth = mkTokenAuth(bearerSecret);
var cookieAuth = mkTokenAuth(cookieSecret);
var cookieName = "tigerface:sid";

module.exports.verifyPassword = verifyPassword;
module.exports.hashPassword = hashPassword;
module.exports.getHeader = getHeader;
module.exports.getPayload = getPayload;
module.exports.bearerAuth = bearerAuth;
module.exports.cookieAuth = cookieAuth;
module.exports.cookieName = cookieName;
module.exports.randomAlphaNumeric = randomAlphaNumeric;
