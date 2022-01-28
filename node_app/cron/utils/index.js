const moment = require('moment');
var faker = require('faker');
const {name} = faker

const makeEmailFromUser = require('./makeEmailFromUser');
const { getRandomAddress } = require('../../utils/geo');

const randomUserData = () => {
  return new Promise(async (res,rej)=>{
    let user = {};
    const random_numbers = Array.from({length: 10}, () => Math.random());
    const address = await getRandomAddress();
    user = {
      ...user,
      first_name: name.firstName(),
      last_name: name.lastName(),
      birthdate: (moment().subtract(12,'years').subtract(random_numbers[4]*30000,'days').format('YYYY-MM-DD')),
      n: random_numbers,
      is_delivery_driver: (random_numbers[6]<0.05)?true:false,
      last_location: address.location
    }
    user['email'] = makeEmailFromUser(user);
    res(user)
  })
}

module.exports = {
  makeEmailFromUser,
  randomUserData
}