const { getRandomAddress, addressFromXY } = require('../../utils/geo')
const knex = require('../knex')

const add = (address, user_id, is_primary=true) => {
  return knex('addresses').insert({
    ...address, 
    foreign_source: 'user', 
    foreign_key: user_id,
    is_primary
  }).returning('*')
}

const getPrimaryFromUser = (user_id) => {
  return knex('addresses').select('id').where({foreign_source: 'user', foreign_key: user_id, is_primary: true}).first()
}

const getUsersWithMultipleAddresses = async () => {
  const test = await knex('user_addresses').select('foreign_key').count('*').as('count').groupBy('foreign_key').havingRaw('count(*)>3').orderBy('count','desc').first()
  const first_address = await knex('user_addresses').select('id').where({foreign_key: test.foreign_key}).orderBy('created_at','desc').first()
  const user_no_address = await knex('users').select('id').whereNotIn('id',knex.raw('SELECT foreign_key FROM user_addresses')).orderBy('created_at','desc').first()
  const update = await knex('addresses').update({foreign_key: user_no_address.id}).where({id: first_address.id}).returning('*')
  return test
}


const createAddressForExistingUser = async (user_id=0) => {
  const user_no_address = await knex('users').select('id').whereNotIn('id',knex.raw('SELECT foreign_key FROM user_addresses')).orderBy('created_at','desc').first()
  if (user_no_address && user_no_address.id) {
    const address = await getRandomAddress();
    const added_address = await add(address, user_no_address.id)
    return added_address
  } else {
    return {id: 0}
  }
}

// const updateAddressWithBadName = async () => {
//   const sf_address1 = await knex.raw(`
//   SELECT id, (STRING_TO_ARRAY(address_formatted,','))[1] as string_to_array
//   FROM addresses
//   WHERE address1 = 'San Francisco' AND (STRING_TO_ARRAY(address_formatted,','))[1] is not null
//   LIMIT 51
//   `)
//   // knex('addresses').select('id,location,formatted_address').select(knex.raw("(STRING_TO_ARRAY(address_formatted,','))[1]")).as('number_route').where({address1: 'San Francisco'}).first();
//   const { rows } = sf_address1;
//   rows.forEach(async ({id, string_to_array})=>{
//     // console.log({id, string_to_array});
//     const test = await knex('addresses').where({id}).update({address1: string_to_array}).returning(['id','address1'])
//     console.log(test)
//     // return test
//   })
//   // return sf_address1
// }



module.exports = {
  add,
  getPrimaryFromUser,
  createAddressForExistingUser
}