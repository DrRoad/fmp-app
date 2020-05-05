const Boom = require('boom')
const ContactAndPDFInformationObjectViewModel = require('../models/contact-and-pdf-information-view')
const QueryString = require('querystring')
const config = require('../../config')
const util = require('../util')
const wreck = require('wreck')
const uuidv1 = require('uuid/v1')
const { getApplicationReferenceNumber } = require('../services/application-reference')
const publishToQueueURL = config.functionAppUrl + '/publish-queue'

module.exports = [
  {
    method: 'GET',
    path: '/contact',
    options: {
      description: 'Get contact details page for product 4',
      handler: async (request, h) => {
        try {
          const recipientemail = request.query.recipientemail
          var PDFinformationDetailsObject = { coordinates: { x: 0, y: 0 } }
          PDFinformationDetailsObject.coordinates.x = request.query.eastings
          PDFinformationDetailsObject.coordinates.y = request.query.northing
          if (recipientemail) {
            return h.view('contact', new ContactAndPDFInformationObjectViewModel(
              {
                fullName: '',
                recipientemail: recipientemail,
                PDFinformationDetailsObject: PDFinformationDetailsObject
              }))
          }
          const model = new ContactAndPDFInformationObjectViewModel({
            PDFinformationDetailsObject: PDFinformationDetailsObject
          }
          )
          return h.view('contact', model)
        } catch (err) {
          return Boom.badImplementation(err.message, err)
        }
      }
    }
  },
  {
    method: 'POST',
    path: '/contact',
    options: {
      handler: async (request, h) => {
        var correlationId = uuidv1()
        try {
          const payload = request.payload
          const applicationReferenceNumber = await getApplicationReferenceNumber()
          var PDFinformationDetailsObject = { coordinates: { x: 0, y: 0 }, applicationReferenceNumber: '' }
          if (request.payload && request.payload.eastings && request.payload.northing) {
            PDFinformationDetailsObject.coordinates.x = request.payload.eastings
            PDFinformationDetailsObject.coordinates.y = request.payload.northing
            PDFinformationDetailsObject.applicationReferenceNumber = applicationReferenceNumber
          } else {
            return Boom.badImplementation('Query parameters are not empty')
          }
          let queryParams = {}
          queryParams.recipientemail = payload.recipientemail
          queryParams.applicationReferenceNumber = applicationReferenceNumber
          queryParams.x = PDFinformationDetailsObject.coordinates.x
          queryParams.y = PDFinformationDetailsObject.coordinates.y
          queryParams.correlationId = correlationId
          queryParams.fullName = payload.fullName
          const query = QueryString.stringify(queryParams)

          const { x, y } = PDFinformationDetailsObject.coordinates
          const name = payload.fullName
          const recipientemail = payload.recipientemail
          const data = JSON.stringify({ name, recipientemail, x, y, applicationReferenceNumber })

          // await util.LogMessage(`Calling the  HttpTrigger with x and y co-ordinates ${x}, ${y}`, '', correlationId)
          await wreck.post(publishToQueueURL, {
            payload: data
          })
          // await util.LogMessage(`Called the HttpTrigger Function `, '', correlationId)
          return h.redirect(`/confirmation?${query}`)
        } catch (err) {
          // util.LogMessage(`${err.message}`, '', correlationId)
          return Boom.badImplementation(err.message, err)
        }
      }
    }
  }]
