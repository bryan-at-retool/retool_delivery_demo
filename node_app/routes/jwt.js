const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')

router.use('/', (req,res)=>{
  try {
    const token = req.headers['authorization'].split('Bearer ')[1];
    const decoded = jwt.decode(token);
    res.send(decoded)
  } catch (e) {
    res.status(400).send(`decode failed for ${req.headers.authorization}`)
  }
})

module.exports = router