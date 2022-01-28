const knex = require('../knex')
const {Client} = require("@googlemaps/google-maps-services-js");
const client = new Client({});
var polyline = require('@mapbox/polyline');
const { getLatLong, getRandomAddress } = require('../../utils/geo');
const { add: addAddress } = require('./addresses');
const { customBetaIndex } = require('../../utils/random');
const { firstStore } = require('./stores');

function getUser(id) { return knex('users').first().select().where({id}) }
function getStore(id) { return knex('stores').first().select().where({id}) }
function getOrder(id) { return knex('orders').first().select().where({id}) }
function getAddress(id) { return knex('addresses').first().select().where({id}) }


function getAvailableDriver() { return knex('users').first().select().where({is_delivery_driver: true}).orderBy(knex.raw('RANDOM()'), 'desc') }


function addDeliveryFromOrder(order_id, overrides = {}) {
  return new Promise(async (res,rej)=>{
    const order = await getOrder(order_id);
    // const user = await getUser(order.user_id);
    let store = await getStore(order.store_id);
    if (!store) {
      store = await firstStore();
    }
    // const driver = await getAvailableDri ver();
    let address = await getAddress(order.address_id)
    const delivery_route = await getRoute(store.location, address.location)
    const delivery_driver = await getAvailableDriver();
    const new_delivery = await knex('deliveries').insert({
      delivery_route,
      store_id: order.store_id,
      user_id: order.user_id,
      order_id: order_id,
      store_location: getLatLong(store.location),
      delivery_location: getLatLong(address.location),
      is_delivered: false,
      address_id: order.address_id,
      delivery_user_id: delivery_driver.id,
      status: 'Ordered',
      ...overrides
    }).returning('*')
    await knex('orders').where({id: order_id}).update({has_delivery: true})
    res(new_delivery)
  })
}

async function getRoute (origin_xy, destination_xy) {
  return new Promise((res,rej)=>{
    client.directions({
      params: {
        key: process.env.GOOGLE_MAPS_API_KEY,
        origin: getLatLong(origin_xy),
        destination: getLatLong(destination_xy),
      }
    })
    .then((r) => {
      const test = polyline.decode(r.data.routes[0].overview_polyline.points) 
      res({...r.data.routes[0], overview_polyline: test.map(point=>point.reverse())})
    })
    .catch((e) => {
      console.log(e.response.data.error_message);
    });
  })
}

const deliverRandomOpenDelivery = async () => {
  const in_finish_window = await knex('orders').whereRaw(` 1=1
  AND estimated_delivery_start > NOW() - INTERVAL '15 minutes'
	AND estimated_delivery_end < NOW() + INTERVAL '30 minutes'
  `).count('*').as('count').first()
  if (in_finish_window.count > 0) {
    const r = customBetaIndex(Number(in_finish_window.count));
    const get_one_delivery = await knex('orders').whereRaw(` 1=1
    AND estimated_delivery_start > NOW() - INTERVAL '15 minutes'
    AND estimated_delivery_end < NOW() + INTERVAL '30 minutes'
    `).select('id').first().offset(r)
    const updateDelivery = await knex('deliveries').where({order_id: get_one_delivery.id}).update({is_delivered: true}).returning('id');
    return updateDelivery;
  } else {
    return [0]
  }
}

module.exports = {
  addDeliveryFromOrder,
  deliverRandomOpenDelivery
}
