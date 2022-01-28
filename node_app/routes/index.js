const express = require('express')
const router = express.Router()


router.use('/users', require('./users'));
router.use('/jwt', require('./jwt'));
router.use('/', require('./checkHealth'));
router.use('/demo_catalog', require('./demo_catalog'));


module.exports = router
