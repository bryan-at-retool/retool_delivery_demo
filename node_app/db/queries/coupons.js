const { customBetaIndex } = require("../../utils/random")
const knex = require("../knex")

const activeCouponWhereRaw = () => knex.raw('expires_at > NOW()')

const getRandomCouponCode = async () => {
  // TODO better randomness on coupon code
  const active_coupon_count = (await knex('coupons').first().count('*').where(activeCouponWhereRaw()))['count'];
  if (active_coupon_count>0) {
    const r = customBetaIndex(active_coupon_count);
    return knex('coupons').first().offset(r).where(activeCouponWhereRaw()).orderBy('created_at', 'desc').select('code')
  } else {
    const data = {
      name: 'New User Promotion',
      category: 'General',
      code: 'NEWUSER',
      coupon_amount: 5,
      coupon_type: 'Fixed Amount'
    }
    return knex('coupons').insert(data, 'id').returning('code')
  }
}

const infrequentActiveCoupons = async () => {
  const test = await knex.raw(`
  WITH current_coupons AS (
    SELECT code FROM coupons WHERE expires_at > NOW()
  ),
  coupon_count_2_or_below as (
    SELECT coupon_code, count(*) as ct
    FROM orders
    WHERE coupon_code IN (SELECT * FROM current_coupons)
    GROUP BY 1
  )
  SELECT code
  FROM current_coupons cc
  LEFT JOIN coupon_count_2_or_below cc2 ON cc2.coupon_code = cc.code
  WHERE COALESCE(ct,0) < 2
  `)
  return test.rows
}

module.exports = {
  getRandomCouponCode,
  infrequentActiveCoupons
}
