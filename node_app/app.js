const createError = require('http-errors')
const express = require('express')
const path = require('path')
const cookieParser = require('cookie-parser')
const logger = require('morgan')
const helmet = require('helmet')

const app = express()


// use helmet
app.use(helmet())

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

if (process.env.NODE_ENV != 'test') {
  app.use(logger('dev'))
}
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res) => res.redirect('/alive'))
app.get('/alive', (req,res)=>{return res.send("alive")})
app.use('/api/v1', require('./routes'))

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404))
})

// error handler
// development
if (app.get('env') === 'development') {
  app.use((err, req, res, next) => {
    res.status(err.status || 500)
    res.json({
      message: err.message,
      error: err,
    })
  })
}
// production
app.use((err, req, res, next) => {
  // send blank error message
  res.status(err.status || 500)
  res.json({
    message: err.message,
    error: {},  
  })
})

// run cron jobs
require('./cron')

module.exports = app
