'use strict'

const Stream = require('stream')
const arrayToStream = require('../array_to_stream')
const Log = require('../log')

const log = Log.stdout()

class MemoryWriteEventsStream extends Stream.Writable {
  constructor(storedEvents) {
    super({ objectMode: true })
    this._storedEvents = storedEvents
    this._transaction = []

    this.once('error', () => {
      this._transaction = []
      this._destroy()
    })

    this.once('finish', () => {
      this._storedEvents.push(...this._transaction)
      this._destroy()
    })
  }

  _write(event, _, callback) {
    log('write(%o)', event)
    if (!event.entityUid) return callback(new Error('Missing entityUid'))
    if (
      !event.entityUid.match(
        /[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}/
      )
    )
      return callback(new Error(`Not a uid: ${event.entityUid}`))
    if (typeof event.entityVersion === 'undefined')
      return callback(new Error('Missing entityVersion'))

    this._transaction.push(event)
    callback()
  }

  _destroy() {
    if (this._destroyed) return
    this._destroyed = true
    // We need to let other stream event listeners be called before emitting
    // 'close', hence the following nextTick. This is not necessary in the
    // PgEventStore because this event is triggered asynchronously, when the
    // SQL transaction is confirmed aborted.
    process.nextTick(() => this.emit('close'))
  }
}

class MemoryEventStore {
  async start() {
    this._assertNotStarted()
    this._started = true
    this._eventList = []
  }

  async stop() {
    this._assertStarted()
    this._started = false
    delete this._eventList
  }

  async dropAllEvents() {
    this._assertStarted()
  }

  findEventsByEntityUid(entityUid) {
    this._assertStarted()
    const events = this._eventList.filter(
      event => event.entityUid === entityUid
    )
    return arrayToStream(events)
  }

  openWriteEventsStream() {
    this._assertStarted()
    return new MemoryWriteEventsStream(this._eventList)
  }

  streamAllEvents() {
    this._assertStarted()
    return arrayToStream(this._eventList)
  }

  async countAllEvents() {
    this._assertStarted()
    return this._eventList.length
  }

  _assertStarted() {
    if (!this._started) {
      throw new Error(`${this.constructor.name} not started!`)
    }
  }

  _assertNotStarted() {
    if (this._started) {
      throw new Error(`${this.constructor.name} already started!`)
    }
  }
}

module.exports = MemoryEventStore
