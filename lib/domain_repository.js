'use strict'

const { PassThrough, Transform } = require('stream')
const UnitOfWork = require('./unit_of_work')
const { NoSuchEntityError } = require('./errors')
const written = require('./written')
const Log = require('./log')
const ReplayFinished = require('./replay_finished')
const makeTransformStream = require('./make_transform_stream')
const log = Log.stdout()

class MarkEventsAsBeingReplayed extends Transform {
  constructor() {
    super({ objectMode: true, highWaterMark: 0 })
  }

  _transform(event, _, callback) {
    this.push(event.with({ isBeingReplayed: true }))
    callback()
  }
}

/**
 * The *domain repository* is the heart of the Event Sourcing infrastructure.
 * Its three main responsibilities are:
 *   - to persist domain events that were triggered on domain entities;
 *   - to push newly-persisted events to the DomainEventBus;
 *   - to restore the state of domain entities from persisted events.
 */
module.exports = class DomainRepository {
  /**
   * @param { DomainEventBus } domainEventBus
   * @param { EventStore } eventStore
   */
  constructor(domainEventBus, eventStore) {
    if (!domainEventBus) throw new Error('Missing domainEventBus')
    if (!eventStore) throw new Error('Missing eventStore')
    this._domainEventBus = domainEventBus
    this._eventStore = eventStore
    this._cache = new Map()
  }

  /**
   * Creates a new UnitOfWork to be committed to this DomainRepository.
   * @returns { UnitOfWork }
   */
  startUnitOfWork() {
    return new UnitOfWork()
  }

  /**
   * Commits all pending events from all entities that were triggered within the
   * unit of work.
   *
   * Domain events are read from the unit of work entities, persisted to the
   * event store and eventually pushed to the domain event bus to be broadcast.
   * @param { UnitOfWork } unitOfWork The unit of work to be committed.
   * @returns { Promise<undefined, Error> }
   */
  async commit(unitOfWork) {
    log('commit started')
    await this._storeUnitOfWorkEvents(unitOfWork)
    await this._broadcastUnitOfWorkEvents(unitOfWork)
    this._cacheUnitOfWorkEntities(unitOfWork)
    log('commit finished')
  }

  /**
   * Restores an entity from the EventStore, based on its past events.
   *
   * All events pertaining to the entityUid are read from the event store and
   * applied to a blank instance of the entity constructor.
   *
   * @param { function } Ctor Entity constructor function
   * @param { string } entityUid Entity UID
   * @returns { Promise<Object, Error> } A promise that resolves to the restored
   * entity instance.
   */
  async loadEntityByUid(Ctor, entityUid) {
    if (!entityUid) throw new Error('I need an entity UID to load')
    if (this._cache.has(entityUid)) return this._cache.get(entityUid)
    return new Promise((resolve, reject) => {
      const entity = new Ctor(entityUid)
      let eventFound = false
      const storedEvents = this._eventStore
        .findEventsByEntityUid(entityUid)
        .once('data', () => (eventFound = true))
        .on('error', reject)
      const entityEvents = entity.openWritableAppliedEventsStream()
      storedEvents
        .pipe(entityEvents)
        .on('finish', () => {
          if (!eventFound) return reject(NoSuchEntityError.make(entityUid))
          this._cache.set(entityUid, entity)
          resolve(entity)
        })
        .on('error', reject)
    })
  }

  /**
   * Broadcasts all existing events to DomainEventBus, in order
   *
   */
  async replayAllEvents({ end = true, monitor = () => {} } = {}) {
    const totalEventCount = await this._eventStore.countAllEvents()
    return new Promise((resolve, reject) => {
      const allEvents = this._eventStore.streamAllEvents()
      let replayedEventCount = 0

      const allReplayingEvents = allEvents
        .pipe(new MarkEventsAsBeingReplayed())
        .pipe(
          makeTransformStream(({ object: event, push }) => {
            replayedEventCount++
            monitor({
              replayedEvents: replayedEventCount,
              totalEvents: totalEventCount,
            })
            push(event)
          })
        )
        .pipe(
          new PassThrough({
            objectMode: true,
            highWaterMark: 0,
            flush(callback) {
              this.push(new ReplayFinished())
              callback()
            },
          })
        )
      allReplayingEvents.on('error', reject)
      allReplayingEvents
        .pipe(
          this._domainEventBus,
          { end }
        )
        .on('error', reject)

      allEvents.on('end', () => {
        log('replayAllEvents end')
        resolve()
      })
    })
  }

  async _storeUnitOfWorkEvents(unitOfWork) {
    const loggingStream = new PassThrough({ objectMode: true })
    loggingStream.on('data', event => log('Storing event %o', event))

    await written(
      unitOfWork
        .getAllEventsStream()
        .pipe(loggingStream)
        .pipe(this._eventStore.openWriteEventsStream()),
      'close'
    )
  }

  _broadcastUnitOfWorkEvents(unitOfWork) {
    return new Promise((resolve, reject) => {
      const eventStream = unitOfWork.getAllEventsStream()
      eventStream.pipe(
        this._domainEventBus,
        { end: false }
      )
      eventStream.once('error', reject)
      eventStream.once('end', resolve)
    })
  }

  _cacheUnitOfWorkEntities(unitOfWork) {
    unitOfWork.entities.forEach(entity => {
      this._cache.set(entity.uid, entity)
      entity.clearPendingEvents()
    })
  }
}
