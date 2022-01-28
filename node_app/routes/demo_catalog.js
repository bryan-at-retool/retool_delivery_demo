const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const knex = require('../db/knex')

const TABLE = 'demo_catalog'

const changedBy = (req) => {
  let changed_by = 'unknown';
  const token = req.headers['authorization'].split('Bearer ')[1];
  const decoded = jwt.decode(token);
  if (decoded.email) {
    changed_by = decoded.email;
  }
  return changed_by
}

router.get('/', async (req,res, next)=>{
  try {
    const { limit, offset} = req.query;
    let builder = knex(TABLE).select('*').orderBy('id','asc');

    if (limit) {builder = builder.limit(limit)}
    if (offset) {builder = builder.offset(offset)}

    const select = await builder;
    const unnested = select.map(({json, ...row})=>{ 
      return {
        ...json, 
        ...row
      }
    })
    res.send(unnested);
  } catch (error) {
    next(error)
  }
});

router.get('/count', async (req,res, next)=>{
  try {
    let select = await knex(TABLE).count('*').as('count').first();
    res.send(select);
  } catch (error) {
    next(error)
  }
});

router.post('/', async (req, res, next)=>{
  try {
    const changed_by = changedBy(req);
    let body = {};
    if (typeof req.body === 'string') {
      body = JSON.parse(req.body)
    } else if (typeof req.body === 'object') {
      body = req.body
    }
    const query =  await knex(TABLE).insert({
      changed_by,
      json: body
    }).returning('*')

    res.send(query);
  } catch (error) {
    next(error)
  }
})

router.get('/:id', async (req,res,next)=>{
  try {
    const id = req.params.id;
    let select = await knex(TABLE).limit(1).where({id}).first();
    res.send(select);
  } catch (error) {
    next(error)
  }
})

router.patch('/:id', async (req,res,next)=>{
  try {
    const id = req.params.id;
    const changed_by = changedBy(req);
    let body = {};
    if (typeof req.body === 'string') {
      body = JSON.parse(req.body)
    } else if (typeof req.body === 'object') {
      body = req.body
    }
    const query = await knex(TABLE).where({id}).update({
      changed_by,
      json: body
    }).returning('*')
    res.send(query)
  } catch (error) {
    next(error)
  }
})

module.exports = router