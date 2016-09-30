var util = require('../util')
var fmpService = require('../../config').envVars.fmp_service
var url = fmpService + '/is-england/'

module.exports = {
  get: function (easting, northing, callback) {
    if (!easting || !northing) {
      return process.nextTick(() => {
        callback(new Error('No point provided'))
      })
    }
    util.getJson(url + easting + '/' + northing, callback)
  }
}