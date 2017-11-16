'use strict'

const Stream = require('stream')
const SagaStream = require('./saga_stream')
const Log = require('./log')

const log = Log.stdout()

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

  connectSagas({ Sagas, commandBus, repoStore }, onConnected = () => {}) {
    for (const Saga of Object.values(Sagas)) {
      this.connect(new SagaStream({ Saga, commandBus, repoStore }))
      onConnected(Saga)
    }
  }
}

module.exports = DomainEventBus
