"use strict";

var view = (function() {

  var div = function(attrs) {
    return $('<div>', attrs);
  };

  var input = function(attrs) {
    return $('<input>', attrs);
  };

  var button = function(attrs) {
    return $('<button>', attrs);
  };

  return {
    div: div,
    input: input,
    button: button
  };

}());
