const knex = require("../knex")

const getRandomStore = () => {
  // TODO make more random with weighted stores and within a certain proximity
  return knex('stores').select('id').orderBy(knex.raw('RANDOM()'), 'desc').first()
}

const firstStore = () => {
  const data = {
    internal_name: 'whole-foods-soma',
    location: knex.raw('point(37.7812284,-122.4018961)'),
    store_hours: '',
    brand: 'Whole Foods',
    name: 'Whole Foods: SoMa',
    phone_number: '+1 (415) 618-0066'
  }
  
  return knex('stores').insert(data, 'id').returning('id')
}

module.exports = {
  getRandomStore,
  firstStore
}