'use strict'

const { Transform, Writable } = require('stream')
const MethodInvokingStream = require('./method_invoking_stream')
const SerialInvoker = require('./serial_invoker')
const { v4: uuid } = require('uuid')

module.exports = class SagaStream extends Transform {
  constructor({
    commandBus,
    Saga,
    repoStore,
    isStartedBy = Saga.isStartedBy.bind(Saga),
    makeUid = uuid,
  }) {
    super({ objectMode: true, highWaterMark: 0 })
    this._commandBus = commandBus
    this._repoStore = repoStore
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
        repoStore: this._repoStore,
        terminate,
        makeUid: this._makeUid,
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
