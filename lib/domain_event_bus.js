'use strict'

const Stream = require('stream')
const MethodInvokingStream = require('./method_invoking_stream')
const SagaStream = require('./saga_stream')
const SerialInvoker = require('./serial_invoker')
const Log = require('./log')

const log = Log.stdout()

// TODO: rename to StreamDomainEventBus
class DomainEventBus extends Stream.Transform {
  constructor() {
    super({ objectMode: true, highWaterMark: 0 })
  }

  _transform(event, _, callback) {
    log('Broadcasting %o', event)
    this.push(event)
    callback()
  }

  connect(stream) {
    const cleanup = () => {
      this.removeListener('end', cleanup)
      this.setMaxListeners(this.getMaxListeners() - 2)
    }

    this.setMaxListeners(this.getMaxListeners() + 2)
    this.on('end', cleanup)
    return this.pipe(stream)
  }

  connectProjector(projector) {
    const projectorStream = new MethodInvokingStream(
      new SerialInvoker(projector.targets(), { shouldRaiseErrors: true })
    )
    this.connect(projectorStream)
  }

  connectSagas({ Sagas, commandBus, params }, onConnected = () => {}) {
    for (const Saga of Object.values(Sagas)) {
      this.connect(new SagaStream({ Saga, commandBus, params }))
      onConnected(Saga)
    }
  }
}

module.exports = DomainEventBus
