'use strict'

const { promisify } = require('util')
const pump = promisify(require('pump'))
const { Writable } = require('stream')

module.exports = async (eventStream, validator) => {
  const validatorStream = new Writable({
    objectMode: true,
    write(event, _, callback) {
      validator.handle(event)
      callback()
    },
  })
  await pump(eventStream, validatorStream)
  return validator.result
}
