const { getPrimaryFromUser, createAddressForExistingUser } = require("../db/queries/addresses");
const { getRandomUser } = require("../db/queries/users")
const moment = require('moment');
const { roundByTime } = require("../utils/order_timing");
const { add } = require('../db/queries/orders');
const { addresses } = require("../db/queries");
const { getRandomAddress } = require("../utils/geo");
const { getRandomStore, firstStore } = require("../db/queries/stores");
const { getRandomCouponCode, infrequentActiveCoupons } = require("../db/queries/coupons");

const DEFAULT_AMOUNT = (amount) => {if (amount) { return amount }; return Math.max(Math.random()*420-10,10).toFixed(2); }
const createNewOrderWithCoupon = (coupon_code) => {
  // TODO make random users, turned off because of geoCode error
  const new_user = (Math.random()<0.15)
  return new Promise(async (res,rej)=>{
    const get_user = await getRandomUser(new_user);
    if (get_user.id) {
      // TODO not_primary_address_always
      let primary_address = await getPrimaryFromUser(get_user.id);
      if (!(primary_address && primary_address.id)) {
        const new_address = await getRandomAddress();
        primary_address = (await addresses.add(new_address, get_user.id, true))[0]
      }
      let store = await getRandomStore();
      if (!store) { store = await firstStore(); }
      const order = {
        user_id: get_user.id,
        store_id: store.id,
        address_id: primary_address.id,
        amount: DEFAULT_AMOUNT(),
        coupon_code,
        estimated_ready_at: roundByTime(moment(), 15, 15),
        estimated_delivery_start: roundByTime(moment(), 30, 15),
        estimated_delivery_end: roundByTime(moment(), 45, 15)
      }
      const new_order = await add(order)
      res(new_order)
    } else {
      res([0])
    }
  })
}

const newOrdersOnNewActiveCoupons = async () => {
  const coupons = await infrequentActiveCoupons();
  if (coupons.length) {
    let promises = [];
    coupons.forEach(({code})=>{
      promises.push(createNewOrderWithCoupon(code))
    })
    const all_new_orders = await Promise.all(promises)
    return all_new_orders
  } else {
    return []
  }
}

const createNewRandOrder = (overrides = {}, default_amount = undefined) => {
  const new_user = (Math.random()<0.15)
  const use_coupon = (Math.random()<0.1);
  return new Promise(async (res,rej)=>{
    let get_user = await getRandomUser(new_user);
    if (get_user.id) {
      // TODO random store
      // TODO not_primary_address_always
      let primary_address = await getPrimaryFromUser(get_user.id);
      if (!(primary_address && primary_address.id)) {
        const new_address = await getRandomAddress();
        primary_address = (await addresses.add(new_address, get_user.id, true))[0]
      }
      let store = await getRandomStore();
      if (!store) { store = await firstStore(); }
      const order = {
        user_id: get_user.id,
        store_id: store.id,
        address_id: primary_address.id,
        amount: DEFAULT_AMOUNT(default_amount),
        estimated_ready_at: roundByTime(moment(), 15, 15),
        estimated_delivery_start: roundByTime(moment(), 30, 15),
        estimated_delivery_end: roundByTime(moment(), 60, 15),
        ...overrides
      }
      if (use_coupon) {
        let coupon = (await getRandomCouponCode())['code']
        order['coupon_code'] = coupon;
      }
      const new_order = await add(order)
      res(new_order)
    } else {
      res([0])
    }
  })
}

module.exports = {
  createNewRandOrder,
  createNewOrderWithCoupon,
  newOrdersOnNewActiveCoupons
}