'use strict'

const { Transform, Writable } = require('stream')
const MethodInvokingStream = require('./method_invoking_stream')
const SerialInvoker = require('./serial_invoker')
const { v4: uuid } = require('uuid')

module.exports = class SagaStream extends Transform {
  constructor({
    commandBus,
    Saga,
    isStartedBy = Saga.isStartedBy.bind(Saga),
    makeUid = uuid,
    params = {},
  }) {
    super({ objectMode: true, highWaterMark: 0 })
    this._commandBus = commandBus
    this._params = params
    this._Saga = Saga
    this._isStartedBy = isStartedBy
    this._makeUid = makeUid
    this.pipe(
      new Writable({
        objectMode: true,
        highWaterMark: 0,
        write: (event, _, cb) => cb(),
      })
    )
    this.resume()
  }

  _transform(event, _, callback) {
    if (this._isStartedBy(event)) {
      const terminate = () => {
        this.unpipe(methodInvokingStream)
        methodInvokingStream.end()
        this.resume()
      }
      const saga = new this._Saga({
        commandBus: this._commandBus,
        terminate,
        makeUid: this._makeUid,
        ...this._params,
      })
      const methodInvokingStream = new MethodInvokingStream(
        new SerialInvoker([saga])
      )
      this._connect(methodInvokingStream)
    }
    this.push(event)
    callback()
  }

  _connect(saga) {
    const cleanup = () => {
      this.removeListener('end', cleanup)
      this.setMaxListeners(this.getMaxListeners() - 2)
    }

    this.setMaxListeners(this.getMaxListeners() + 2)
    this.on('end', cleanup)
    return this.pipe(saga)
  }
}
