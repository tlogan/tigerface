'use strict';
var express = require('express');
var server = express();
var bodyParser = require('body-parser');
var _ = require('lodash');
var q = require('q');
var path = require('path');

var jsonParse = bodyParser.json();

let partition = require('./partition');
let port = _.drop(process.argv, 2)[0] || 5555; 
let part = partition.mk(port);


let evalF = fStr => {
  let f = eval("var fn = " + invitation.process + "; fn;");
  return f;
}

server.post("/insert", jsonParse, (req, res, next) => {
  let b = req.body;
  res.json(part.insert(b.family, b.attrs));
});

server.post("/update", jsonParse, (req, res, next) => {
  let b = req.body;
  res.json(part.update(evalF(b.set), evalF(b.filter), b.env));
});

server.post("/flatMap", jsonParse, (req, res, next) => {
  let b = req.body;
  res.json(part.flatMap(evalF(b.f), b.env));
});

server.post("/reduce", jsonParse, (req, res, next) => {
  let b = req.body;
  res.json(part.reduce(evalF(b.f), b.k, b.vs, b.env));
});

server.post("/remove", jsonParse, (req, res, next) => {
  let b = req.body;
  res.json(part.remove(evalF(b.filter), b.env));
});

server.post("/save", jsonParse, (req, res, next) => {
  part.save();
  res.json({});
});

server.post("/load", jsonParse, (req, res, next) => {
  part.load();
  res.json({});
});

server.use((err, req, res, next) => {
  if (err.statusCode !== undefined) {
    console.log("Error: ", err.body);
    res.status(err.statusCode);
    res.json(err.body);
  } else if (_.isString(err)){
    console.log("Error: ", err);
    res.status(400);
    res.json({
      "name": "error",
      "errors": [err]
    });
  } else {
    console.log("Error: ", err);
    res.status(400);
    res.json(err);
  }
});


part.load();

process.on ('SIGINT', () => {
  process.exit (0);
});

process.on('exit', (code) => {
  part.save();
});

//serve data to authorized users
server.listen(parseInt(port), () => {
    console.log('Partition listening on port ' + port + '!\n');
});
