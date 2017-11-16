'use strict'

const Stream = require('stream')

class FilterStream extends Stream.Transform {
  constructor(filter) {
    super({ objectMode: true })
    this._filter = filter
  }

  _transform(object, _, callback) {
    if (this._filter.accept(object)) this.push(object)
    callback()
  }
}

module.exports = FilterStream
