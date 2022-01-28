var moment = require('moment')
// var main = Date.now() //2020-03-13T23:17:34+01:00
const roundByTime = (timestamp, minutes_to_add, round_to_minute) => {
  var mainFormat = moment(timestamp).add(minutes_to_add, 'minute')
  var secs = mainFormat.second()
  var justMinutes = mainFormat.subtract(secs, 'seconds')
  var remainder = round_to_minute - (justMinutes.minute() % round_to_minute);
  var dateTime = moment(justMinutes).add(remainder, 'minutes')
  return dateTime.toISOString();
}

module.exports = {
  roundByTime
}
