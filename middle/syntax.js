'use strict';
var _ = require('lodash');

let hasFullNameSyntax = fullName => {
  var re = new RegExp("^[A-Za-z0-9\- ]+$");
  var matches = fullName && fullName.match(re); 
  return matches && matches.length > 0;
};

let hasUsernameSyntax = username => {
  var re = new RegExp("^[a-z0-9]+$");
  var matches = username && username.match(re); 
  return matches && matches.length > 0;
};

let hasPasswordSyntax = password => {
  var re = new RegExp("^[a-z0-9]+$");
  var matches = password && password.match(re); 
  return matches && matches.length > 0;
};

let hasFamilySyntax = family => {
  var re = new RegExp("^[a-z_]+$");
  var matches = family && family.match(re); 
  return matches && matches.length > 0;
};

let hasIndexSyntax = index => {
  var re = new RegExp("^[a-z0-9]+$");
  var matches = index && index.match(re); 
  return matches && matches.length > 0;
};


module.exports.hasFullNameSyntax = hasUsernameSyntax;
module.exports.hasUsernameSyntax = hasUsernameSyntax;
module.exports.hasPasswordSyntax = hasUsernameSyntax;
module.exports.hasFamilySyntax = hasFamilySyntax;
module.exports.hasIndexSyntax = hasIndexSyntax;
