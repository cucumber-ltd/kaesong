'use strict'

const { Transform } = require('stream')

module.exports = transform =>
  new Transform({
    objectMode: true,
    highWaterMark: 0,
    transform: function(object, _, callback) {
      transform.call(this, { object, push: this.push.bind(this) })
      callback()
    },
  })
