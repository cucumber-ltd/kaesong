'use strict'

module.exports = value => encodeURIComponent(value).replace(/%20/g, '+')
