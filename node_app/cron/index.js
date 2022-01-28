const cron = require("node-cron");
const knex = require('../db/knex');
const { deliverRandomOpenDelivery } = require("../db/queries/deliveries");
const { largeOrderWorkflow } = require("./large_order_workflow");
const { largeRefundWorkflow } = require("./large_refund_workflow");
const { createRandomNewDelivery } = require("./new_delivery");
const { createNewRandOrder, newOrdersOnNewActiveCoupons } = require("./new_order");
const { openDeliveryWorkflow } = require("./open_delivery_workflow");


cron.schedule("*/1 * * * *", async function() {
  const new_orders = await newOrdersOnNewActiveCoupons();
  if (new_orders.length) {
    console.log('created new orders for new active coupons');
  }
});

cron.schedule("*/1 * * * *", async function() {
  const new_delivery = await openDeliveryWorkflow();
});

cron.schedule("*/1 * * * *", async function() {
  await largeOrderWorkflow();
});

cron.schedule("*/1 * * * *", async function() {
  await largeRefundWorkflow();
});

