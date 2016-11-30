"use strict";

var common = (function() {

  var http = function(method, useJson) { return function(bearerToken) { return function(url, data, success, error) {
    var headers = _.assign({}, bearerToken ? { 'Authorization': 'Bearer ' + bearerToken} : {});
    return $.ajax({
      cache: false,
      dataType: 'json',
      type: method,
      contentType: useJson ? 'application/json' : 'application/x-www-form-urlencoded; charset=UTF-8',
      url: url,
      data: method.toLowerCase() == 'post' ? JSON.stringify(data) : data,
      headers: headers,
      success: function(result) {
        success && success(result);
      },
      error: function(jqXhr, textStatus, errorThrown) {
        console.log("jqXhr: " + JSON.stringify(jqXhr));
        console.log("errorStatus: " + textStatus);
        console.log("errorThrown: " + errorThrown);
        error && error(jqXhr, textStatus, errorThrown);
        if (!error) {
        }
      }
    });
  }}};



  var authGet = http('get', true); 
  var authPost = http('post', true); 

  var get = authGet(null); 
  var post = authPost(null); 

  return {
    http: http, 
    authGet: authGet,
    authPost: authPost,
    get: get,
    post: post
  };

}());
