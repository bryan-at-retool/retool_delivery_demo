const knex = require('../db/knex')
const express = require('express')
const router = express.Router()


router.use('/checkHealth', (req,res)=>{
  knex('open_deliveries').count('*').as('count').first().then(r=>{
    if (r.count > 0) {
      res.status(200).send({status: 'ok'})
    } else {
      res.status(500).send('No Open Deliveries')
    }
  })
})
router.use('/api/checkHealth', (req,res)=>{
  knex('open_deliveries').count('*').as('count').first().then(r=>{
    if (r.count > 0) {
      res.status(200).send({status: 'ok'})
    } else {
      res.status(500).send('No Open Deliveries')
    }
  })
})

module.exports = router