var knex = require('../knex')

const add = (order) => {
  return knex('orders').insert(order).returning('id')
}

const getRandomOrderWithoutDelivery = ()=>{
  return knex('orders').select('id').where({has_delivery: false}).first()
}

module.exports = {
  add,
  getRandomOrderWithoutDelivery
}