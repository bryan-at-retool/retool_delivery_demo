const express = require('express')
const router = express.Router()

const {users} = require('../db/queries')

/* GET  all shows. */
router.get('/', async (req, res, next) => {
  try {
    let shows = await users.all()
    res.status(200).json(shows)
  } catch (error) {
    next(error)
  }
})
/* POST (add new) show. */
router.post('/', async (req, res, next) => {
  const required = ['first_name','last_name','email','household_id']
  let missing_keys = []
  const {body} = req
  required.forEach(key=>{
    if (Object.keys(body).indexOf(key) === -1) {
      missing_keys.push(key)
    }
  })
  if (missing_keys.length) {
    res.send(400,`missing fields: ${missing_keys.join(', ')}`)
  } else {
    try {
      let [user_id, ...rest] = await users.add(req.body)
      let user = await users.get(user_id, true)
      res.status(200).json(user)
    } catch (error) {
      next(error)
    }
  }
})

module.exports = router
