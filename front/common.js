"use strict";

var common = (function() {

  var http = function(method, useJson, bearerToken) {return function(url, data, success, error) {
    var headers = _.assign({}, bearerToken ? { 'Authorization': 'Bearer ' + bearerToken} : {});
    return $.ajax({
      cache: false,
      dataType: 'json',
      type: method,
      contentType: useJson ? 'application/json' : 'application/x-www-form-urlencoded; charset=UTF-8',
      url: url,
      data: useJson ? JSON.stringify(data) : data,
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
  }};


  var get = http('get', true, null); 

  var post = http('post', true, null); 



  return {
    http: http, 
    get: get,
    post: post,
  };

}());
