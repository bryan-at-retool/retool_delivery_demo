const knex = require('../db/knex');
const moment = require('moment')
const { createNewRandOrder } = require('./new_order');
const filter = require('lodash/filter');
const { addDeliveryFromOrder } = require('../db/queries/deliveries');

const largeOrderWorkflow = async () => {
  // Delete Rejected and Closed from > 3 minutes ago;

  const close_alerts = await knex('alerts').whereIn('status', ['Approved','Rejected']).where({foreign_source: 'order'}).where('updated_at','<', moment().subtract(3, 'minutes')).select('*');
  if (close_alerts && close_alerts.length) {
    const approved = filter(close_alerts, {status: 'Approved'});
    if (approved && approved.length) {
      approved.forEach(alert=>{
        addDeliveryFromOrder(alert.foreign_key);
        console.log(`added delivery for order: ${alert.foreign_key}`)
      })
    }
    const rejected = filter(close_alerts, {status: 'Rejected'});
    if (rejected && rejected.length) {
      const delete_orders = await knex('orders').whereIn('id', rejected.map(r=>r.foreign_key  )).delete()
      console.log(`deleted ${delete_orders} orders: ${rejected.map(r=>r.id).join(',')}`)
    }
    const delete_alerts = await knex('alerts').whereIn('id', close_alerts.map(r=>r.id)).delete()
    console.log(`deleted ${delete_alerts} alerts`)
  }

  const first_open_order_alert = await knex('alerts').whereIn('status', ['Open']).where({foreign_source: 'order'}).first().select('*')
  if (first_open_order_alert && first_open_order_alert.foreign_key) {
    return knex('orders').where({id: first_open_order_alert.foreign_key}).select('*').first().orderBy('id','desc');
  } else {
    // new large order
    const amount = (Math.random()*1000+1000).toFixed(2);
    const new_order = await createNewRandOrder({}, amount);
    console.log(`Large order needed, created order: ${new_order[0]}`);
    // create alert
    return knex('alerts').insert({
      type: 'Large Order',
      status: 'Open',
      description: `A large order ($${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")})  was placed by a customer that needs approval`,
      foreign_key: new_order[0],
      foreign_source: 'order'
    }).returning('*')
  }
}


module.exports = {
  largeOrderWorkflow
}