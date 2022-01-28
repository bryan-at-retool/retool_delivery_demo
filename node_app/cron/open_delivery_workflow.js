const knex = require('../db/knex')
const moment = require('moment')
const { addDeliveryFromOrder } = require("../db/queries/deliveries")
const filter = require('lodash/filter')
const { createNewRandOrder } = require('./new_order')
const { roundByTime } = require('../utils/order_timing')

const openDeliveryWorkflow = async () => {
  let open = await closeAllDeliveriesGreaterThanMinutes(60);
  open = await promoteStatuses(open);
  open = await checkOrderedForActions(open);
  open = await checkReadyForActions(open);
  open = await checkEnRouteForActions(open);
  return knex('open_deliveries').select(['status','action_required']).count().groupBy(['status','action_required'])
}



const open_dels = () => { return knex('open_deliveries').select('*').orderBy('estimated_ready_at', 'desc'); }


const checkEnRouteForActions = (open) => {
  const n = 2;
  return new Promise(async (res,rej)=>{
    const late_deliveries = filter(open, {status: 'En Route', action_required: 'Late Delivery' })
    const create =  n-late_deliveries.length

    console.log('EnRoute actions: '+create )
    if (create === 0) {
      res(open)
    }
    let queries = [];
    if (create > 0 ) {
      for (var i=0; i<create; i++) {
        queries.push(insertNewOrderedLateDelivery());
      }
    } else {
      for (var i=0; i>create; i--) {
        queries.push(
          knex('deliveries').where({id: late_deliveries[i*-1]['id']}).update({
            is_delivered: true,
            status: 'Delivered',
            updated_at: moment().toISOString()
          })
        )
      }
    } 
    const new_deliveries = await Promise.all(queries);
    const new_open = await open_dels()
    res(new_open)
  })
}

const insertNewOrderedLateDelivery = async () => {
  let time = moment().subtract(60,'minutes');
  const order = await createNewRandOrder({
    estimated_ready_at: roundByTime(time, 15, 15),
    estimated_delivery_start: roundByTime(time, 30, 15),
    estimated_delivery_end: roundByTime(time, 45, 15),
    updated_at: moment().toISOString(),
    created_at: time
  });
  return addDeliveryFromOrder(order[0], {
    status: 'Ready',
    created_at: time,
    updated_at: moment().toISOString()
  });
}

const checkOrderedForActions = (open) => {
  const n=2;
  return new Promise(async (res,rej)=>{
    const late_fulfillment = filter(open, {status: 'Ordered', action_required: 'Late Fulfillment' })
    const create = n-late_fulfillment.length
    console.log('ordered actions: '+create )
    let queries = [];
    if (n===0) {
      res(open)
    }
    if (create >0 ) {
      for (var i=0; i<create; i++) {
        queries.push(insertNewOrderedLateFulfillment());
      }
    } else {
      for (var i=0; i>create; i--) {
        queries.push(
          knex('deliveries').where({id: late_fulfillment[i*-1]['id']}).update({
            status: 'Ready',
            updated_at: moment().toISOString()
          })
        )
      }
    }
    const new_deliveries = await Promise.all(queries);
    // console.log(...new_deliveries)
    const new_open = await open_dels()
    res(new_open)
  })
}
const checkReadyForActions = (open) => {
  return new Promise(async (res,rej)=>{
    const expected_late = filter(open, {status: 'Ready', action_required: 'Expected Late Driver Pickup' });
    const create_expected = 2-expected_late.length
    const late_driver = filter(open, {status: 'Ready', action_required: 'Late Driver Pickup' });
    const create_driver = 1-late_driver.length

    let queries = [];
    if (create_expected === 0 && create_driver === 0) {
      res(open);
    }
    if (create_driver > 0) {
      for (var i=0; i<create_driver; i++) {
        queries.push(insertNewReadyLate('driver'));
      }
    }
    if (create_driver < 0) {
      for (var i=0; i>create_driver; i--) {
        queries.push(
          knex('deliveries').where({id: late_driver[i*-1]['id']}).update({
            status: 'En Route',
            updated_at: moment().toISOString()
          })
        )
      }
    }
    if (create_expected > 0) {
      for (var i=0; i<create_expected; i++) {
        queries.push(insertNewReadyLate('expected'));
      }
    }
    if (create_expected < 0) {
      for (var i=0; i>create_expected; i--) {
        queries.push(
          knex('deliveries').where({id: expected_late[i*-1]['id']}).update({
            status: 'En Route',
            updated_at: moment().toISOString()
          })
        )
      }
    }
    const new_deliveries = await Promise.all(queries);
    const new_open = await open_dels();
    res(new_open)
  })
}

const insertNewReadyLate = async (type) => {
  let time = moment().subtract(60,'minutes');
  if (type==='expected') {
    time = moment().subtract(35,'minutes');
  } 
  const order = await createNewRandOrder({
    estimated_ready_at: roundByTime(time, 15, 15),
    estimated_delivery_start: roundByTime(time, 30, 15),
    estimated_delivery_end: roundByTime(time, 45, 15),
    updated_at: moment().toISOString(),
    created_at: time
  });
  console.log({order, from: 'insertNewReadyLate'});
  return addDeliveryFromOrder(order[0], {
    status: 'Ready',
    created_at: time,
    updated_at: moment().toISOString()
  });
}

const insertNewOrderedLateFulfillment = async () => {
  const time = moment().subtract(30,'minutes');
  const order = await createNewRandOrder({
    estimated_ready_at: roundByTime(time, 15, 15),
    estimated_delivery_start: roundByTime(time, 30, 15),
    estimated_delivery_end: roundByTime(time, 60, 15),
    updated_at: moment().toISOString(),
    created_at: time
  });
  console.log({order, from: 'insertNewOrderedLateFulfillment'});
  return addDeliveryFromOrder(order[0], {
    status: 'Ordered',
    created_at: time,
    updated_at: moment().toISOString()
  });
}

const promoteStatuses = (open) => {
  const en_route = filter(open, {status: 'En Route'});
  const placed = filter(open, {status: 'Ordered'});
  const ready = filter(open, {status: 'Ready'});
  let promote = {
    en_route: 10-en_route.length,
    ready: 10 -ready.length,
    placed: 10-placed.length,
  }
  return new Promise(async (res,rej)=>{
    const trx = await knex.transaction(trx=>{
      let queries = [];
      if (promote.en_route > 0) {
        promote.ready += promote.en_route;
        for (var i=0; i<promote.en_route && i<ready.length; i++) {
          queries.push(
            knex('deliveries').where({id: ready[i]['id']}).update({
              updated_at: moment().toISOString(), 
              status: 'En Route'
            }).transacting(trx)
          )
        }
      }

      if (promote.ready > 0) {
        promote.placed += promote.ready;
        for (var i=0; i<promote.ready && i<placed.length; i++) {
          queries.push(
            knex('deliveries').where({id: placed[i]['id']}).update({
              updated_at: moment().toISOString(),
              status: 'Ready'
            }).transacting(trx)
          )
        }
      }
      return Promise.all(queries) // Once every query is written
    })
    let new_placed_promises = []
    if (promote.placed > 0) {
      for (var i=0; i<promote.placed; i++) {
        new_placed_promises.push(createPlaced());
      }
    }
    const new_placed = await Promise.all(new_placed_promises)
    const new_open = await open_dels()
    res(new_open);
  })
}

const createPlaced = () => {
  return new Promise( async (res,rej)=>{
    const order = await createNewRandOrder();
    const delivery = await addDeliveryFromOrder(order[0]);
    res(delivery);
  })
}


const closeAllDeliveriesGreaterThanMinutes =  (minutes) => {
  return new Promise(async (res,rej)=>{
    const dels = await knex('open_deliveries').where('estimated_delivery_end', '<=', moment().subtract(minutes, 'minutes')).select('id');
    const trx = await knex.transaction(trx=>{
      let queries = [];
      dels.forEach(row=>{
        const query = knex('deliveries').where({id: row.id}).update({
          updated_at: moment().toISOString(), 
          is_delivered: true, 
          status: 'Delivered',
          updated_at: moment().toISOString()
        }).transacting(trx); // This makes every update be in the same transaction
        queries.push(query);
      })
      return Promise.all(queries) // Once every query is written
    })
    const open = await open_dels()
    res(open);
  })
}

module.exports = {
  openDeliveryWorkflow
}