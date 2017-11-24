'use strict'

const arrayToStream = require('./array_to_stream')
const Entity = require('./entity')

/**
 * Represents a transaction of events that happened in the domain.
 *
 * Used by command handlers to track the Entities that are
 */
module.exports = class UnitOfWork {
  constructor() {
    this._entities = []
  }

  /**
   * Called by a command handler to register entities as playing a part in this transaction.
   *
   * @param entity
   */
  add(...entities) {
    if (!entities.length === 0) throw new Error('No entities to add')
    for (const entity of entities) {
      if (!(entity instanceof Entity))
        throw new Error(`Not an Entity: ${entity}`)
    }
    this._entities = this._entities.concat(entities)
  }

  /**
   * Returns all the events that happened on the registered entities during the
   * transaction.
   *
   * @returns {Array} a readable stream of the events.
   */
  getAllEvents() {
    return this._entities
      .reduce((events, entity) => events.concat(entity.pendingEvents), [])
      .sort((event1, event2) => event1.sequenceNumber - event2.sequenceNumber)
  }

  /**
   * Called by the DomainRepository to fetch all the events that happened on the registered
   * entities during the transaction.
   *
   * @returns {ReadableStream} a readable stream of the events.
   */
  getAllEventsStream() {
    return arrayToStream(this.getAllEvents())
  }
}
