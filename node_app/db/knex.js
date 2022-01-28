const knex = require('knex')
const knexfile = require('../knexfile.js')

const environment = process.env.NODE_ENV || 'development'

const config = knexfile[environment]
module.exports = knex(config)
