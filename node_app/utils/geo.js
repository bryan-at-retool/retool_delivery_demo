const markets = require('./geo_polygons');
var randomPointsOnPolygon = require('random-points-on-polygon');
const sample = require('lodash/sample');
const find = require('lodash/find');

const {Client} = require("@googlemaps/google-maps-services-js");
const { customBetaIndex } = require('./random');
const client = new Client({});

const AVAILABLE_MARKETS = ['sf_county','san_mateo_county']



const getLatLong = (loc) => `${loc.x},${loc.y}`
const getLatLongXY = ([lng, lat]) => { return {x: lat, y: lng } }

const getRandomPosition = (market) => {
  const market_details =  markets[market];
  const rand = customBetaIndex(market_details.length )
  
  const geometry = JSON.parse(market_details[rand].geom);
  const test = randomPointsOnPolygon(1, {geometry, type: 'Feature' })
  const xy = getLatLongXY(test[0].geometry.coordinates);
  return xy
}

const reverseGeocode = (latlng_xy) => {
  return new Promise(async (res,rej)=>{
    const test = await client.reverseGeocode({
      params: {
        latlng: getLatLong(latlng_xy),
        key: process.env.GOOGLE_MAPS_API_KEY,
      }
    })
    res(test.data.results[0]);
  })
}

const findComponent = (reverseGeo, type, key) => {
  const found = find(reverseGeo.address_components, (c)=>{
    return (c.types.indexOf(type) >-1)
  })
  if (found) {
    return found[key]
  } else {
    return ''
  }
}

const getRandomAddress = (available_markets=AVAILABLE_MARKETS) => {
  return new Promise (async (res,reg)=>{
    const market = sample(available_markets);
    const xy = getRandomPosition(market);
    const address_details = await reverseGeocode(xy);
    const address = extractAddressFromReverse(address_details)
    res(address);
  })
}


const addressFromXY = (xy) => {
  return new Promise(async (res,rej)=>{
    const address_details = await reverseGeocode(xy);
    const address = extractAddressFromReverse(address_details)
    res(address);
  })
}

const extractAddressFromReverse = (reverseGeo) => {
  return {
    address1: findComponent(reverseGeo, 'street_number', 'long_name') + ' ' + findComponent(reverseGeo, 'route', 'long_name'),
    address2: undefined,
    address3: undefined,
    address_formatted: reverseGeo.formatted_address,
    city: findComponent(reverseGeo, 'locality', 'long_name'),
    state_province: findComponent(reverseGeo, 'administrative_area_level_1', 'short_name'),
    zip_postal: findComponent(reverseGeo, 'postal_code', 'long_name'),
    country: findComponent(reverseGeo, 'country', 'short_name'),
    location: getLatLong({x: reverseGeo.geometry.location.lat, y: reverseGeo.geometry.location.lng})
  }
}

const haversineDistance = (start_xy, end_xy, unit) => {
  const RADII = {
    km:    6371,
    mile:  3960,
    meter: 6371000,
    nmi:   3440
  }

  const toRad = (num) => { return num * Math.PI / 180 }

  var dLat = toRad(end_xy.y - start_xy.y)
  var dLon = toRad(end_xy.x - start_xy.x)
  var lat1 = toRad(start_xy.y)
  var lat2 = toRad(end_xy.y)

  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2)
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

  return RADII(unit) * c
}

module.exports = {
  getLatLong,
  getRandomAddress,
  haversineDistance,
  addressFromXY
}
