const { randomUserData } = require('../../cron/utils');
const { customRnd, customBetaIndex } = require('../../utils/random');
const knex = require('../knex')

function Users() {
  return knex('users')
}

// *** queries *** //

function all() {
  return Users().select()
}

function get(user_id, with_household_plan = false) {
  let user = Users().select("users.*")
  if (with_household_plan){
    user.leftJoin('households', 'users.household_id', 'households.id');
    user.select("households.household_plan");
  }
  return user.where('users.id', '=', parseInt(user_id)).first()
}

const getRandomUser = (new_user=true) => {
  return new Promise( async (res,rej)=>{
    if (!new_user) {
      const users_with_orders_subquery = knex('orders').select('user_id')
      const ct_users_no_orders = await knex('users').count('*').whereNotIn('id', users_with_orders_subquery).first()
      const count = ct_users_no_orders.count;
      if (count > 0) {
        const random = Math.floor(customBetaIndex(count))
        const get_random_user = await knex('users').select('id').whereNotIn('id', users_with_orders_subquery).orderBy('created_at', 'desc').first().offset(random)
        res(get_random_user)
      }
    }
    let new_user_data = await randomUserData();
    const {n, ...user_out } = new_user_data;
    let new_user_db = await add(user_out);
    res({id: new_user_db[0]})
    
  })
}

function add(user_data) {
  return Users().insert(user_data, 'id').returning('id')
}

function update(user_id, updates) {
  return Users().where('id', parseInt(showID)).update(updates)
}

function del(user_id) {
  return Users().where('id', parseInt(showID)).del()
}

module.exports = {
  all, 
  add,
  get,
  getRandomUser
}
