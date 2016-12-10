'use strict';

var _ = require('lodash');
var spawn = require('child_process').spawn;

let user = _.drop(process.argv, 2)[0] || ''; 

var config = require('config').get("middle");
let clusterObj = config.clusters; 

let partitionAddresses = _.flatMap(_.values(clusterObj), addrObj => [addrObj.master, addrObj.slave]);

let prcs = _.map(partitionAddresses, (addr) => {

  let twoParts = _.split(addr, ":"); 
  let host = twoParts[0];
  let port = twoParts[1];


  if (host == 'localhost') {
    return spawn('node', ['back/main.js', port]);
  } else {
    return spawn('ssh',  [user, host, 'node', 'back/main.js', port]);
  }

});



let middlePort = config.port; 

let middlePrc = spawn('node', ['middle/main.js', middlePort]);
