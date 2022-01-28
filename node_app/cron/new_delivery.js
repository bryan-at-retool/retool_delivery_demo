const { addDeliveryFromOrder } = require("../db/queries/deliveries")
const { getRandomOrderWithoutDelivery } = require("../db/queries/orders")
const { createNewRandOrder } = require("./new_order")


const createRandomNewDelivery = async () => {
  let order = await getRandomOrderWithoutDelivery()
  if (order.id) {
    return addDeliveryFromOrder(order.id)
  } else {
    order = await createNewRandOrder()
    return addDeliveryFromOrder(order.id)
  }
}

module.exports = {
  createRandomNewDelivery
}