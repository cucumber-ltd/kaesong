'use strict'

const { Writable } = require('stream')

module.exports = class WritableAppliedEventsStream extends Writable {
  constructor(entity) {
    super({ objectMode: true })
    this._entity = entity
  }
  _write(event, _, callback) {
    try {
      this._entity.applyEvent(event)
      callback()
    } catch (err) {
      callback(err)
    }
  }
}
