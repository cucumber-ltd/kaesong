'use strict'

const { Writable } = require('stream')
const written = require('./written')

module.exports = async (eventStream, validator) => {
  const validatorStream = new Writable({
    
    objectMode: true,
    write(event, _, callback) {
      validator.handle(event)
      callback()
    },
  })
  await written(eventStream.pipe(validatorStream))
  return validator.result
}
