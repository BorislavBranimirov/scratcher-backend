const types = require('pg').types;
// convert 64-bit integers to Number instead of String
types.setTypeParser(20, (val) => parseInt(val, 10));

const knex = require('knex');
const knexfile = require('../knexfile');
const env = process.env.NODE_ENV || 'development';
const configOptions = knexfile[env];

module.exports = knex(configOptions);