const knex = require('../knex')
function Households() {
  return knex('households')
}

// *** queries *** //

function get(id) {
  return Households().select().where('households.id', '=', parseInt(id)).first()
}

function lastHousehold() {
  return Households().select('id').orderBy('id','desc').first()
  // return new Promise((res)=>res(500))
}

function add(household_data) {
  return Households().insert(household_data, 'id')
}

function updatePrimaryUser(user_id, household_id) {
  return Households()
    .where('id', '=', Number(household_id))
    .update({
      primary_user_id: Number(user_id)
    })
}

module.exports = {
  add,
  get,
  updatePrimaryUser,
  lastHousehold
}
