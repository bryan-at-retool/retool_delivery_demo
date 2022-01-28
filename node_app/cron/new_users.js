const moment = require('moment');
var faker = require('faker');
const {internet, name} = faker
// let Users = require('../db/queries/users');
let { addresses: Addresses, users: Users} = require('../db/queries');
// let Households = require('../db/queries/households');
const makeEmailFromUser = require('./utils/makeEmailFromUser');
const { getRandomAddress } = require('../utils/geo');
const { randomUserData } = require('./utils');

const generateNewRandomUser = async () => {
  return newUser();
}

const newUser = (user_override={}) => {
  return new Promise(async (res,rej)=>{
    let user = await randomUserData();
    user = {...user, ...user_override};
    const {n, ...user_out } = user;
    const new_user_id = await Users.add(user_out)
    const new_address = await Addresses.add(address, new_user_id[0], true)
    res(new_user_id)
  })
}

module.exports = {
  generateNewRandomUser
}