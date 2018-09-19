'use strict'

const { Writable } = require('stream')

module.exports = class MethodInvokingStream extends Writable {
  constructor(target) {
    super({ objectMode: true })
    this._target = target
  }

  _write(event, _, callback) {
    if (this._writableState.destroyed) return callback()
    this._target.on(event).then(() => callback(), callback)
  }
}
