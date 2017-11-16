'use strict'

const { Writable } = require('stream')

module.exports = class MethodInvokingStream extends Writable {
  constructor(target) {
    super({ objectMode: true, highWaterMark: 0 })
    this._target = target
  }

  _write(event, _, callback) {
    this._target.on(event).then(() => callback(), callback)
  }
}
