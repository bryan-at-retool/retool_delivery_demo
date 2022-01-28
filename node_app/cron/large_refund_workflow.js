const knex = require('../db/knex');
const moment = require('moment');
const filter = require('lodash/filter')

const largeRefundWorkflow = async () => {
  // close alerts
  const close_alerts = await knex('alerts').whereIn('status', ['Approved','Rejected']).where({foreign_source: 'refund'}).where('updated_at','<', moment().subtract(3, 'minutes')).select('*');
  if (close_alerts && close_alerts.length) {
    const approved = filter(close_alerts, {status: 'Approved'})
    const rejected = filter(close_alerts, {status: 'Rejected'})
    if (rejected && rejected.length) {
      const removed_refunds = await knex('refunds').whereIn('id',rejected.map(r=>r.foreign_key)).delete();
      console.log(`Deleted ${removed_refunds} Refunds: ${rejected.map(r=>r.foreign_key).join(',')}`);
    }
    const delete_alerts = await knex('alerts').whereIn('id', close_alerts.map(r=>r.id)).delete();
    console.log(`Closed ${delete_alerts} refund alerts; approved (${approved.length}), rejected (${rejected.length})`);
  }


  // make sure we have one open large refund
  const first_open_refund_alert = await knex('alerts').whereIn('status', ['Open']).where({foreign_source: 'refund'}).first().select('*')
  if (first_open_refund_alert && first_open_refund_alert.foreign_key) {
    return await knex('alerts').whereIn('status', ['Open']).where({foreign_source: 'refund'}).first().select('*')
  } else {
    const orders_with_refunds = knex('refunds').select('order_id').whereNotNull('order_id')
    const random_order = await knex('orders')
      .where('amount', '>', '100')
      .select(['id','amount','user_id'])
      .first()
      .whereBetween('created_at', [moment().subtract(7, 'days').toISOString(),moment().subtract(1, 'days').toISOString()])
      .whereNotIn('id', orders_with_refunds)
      .orderByRaw('RANDOM() ASC')
    console.log(`Refunding full order: ${random_order.id}`)
    return knex('refunds').insert({
      category: 'Delivery Problems',
      reason: 'Never delivered',
      other_description: `The customer claims that it was never delivered, refunding full order amount ($${random_order.amount})`,
      credit_amount: random_order.amount,
      user_id: random_order.user_id,
      order_id: random_order.id
    }).returning('*')
  }
}


module.exports = {
  largeRefundWorkflow
}