'use strict'

const WritableAppliedEventsStream = require('./writable_applied_events_stream')

class StatefulEntity {
  constructor(uid) {
    if (!uid) throw new Error('Missing UID')
    this.uid = uid

    let version = 0,
      pendingEvents = [],
      state

    Object.defineProperties(this, {
      version: { get: () => version, enumerable: false },
      _version: {
        set: newVersion => (version = newVersion),
        enumerable: false,
      },
      pendingEvents: { get: () => pendingEvents, enumerable: false },
      _pendingEvents: {
        set: events => (pendingEvents = events),
        get: () => pendingEvents,
        enumerable: false,
      },
      state: {
        set: newState => (state = newState),
        get: () => state,
        enumerable: false,
      },
    })

    Object.freeze(this)

    return new Proxy(this, {
      get: (target, member) => {
        if (member === 'then') return
        if (!(member in target))
          throw new Error(
            `Member "${member.toString()}" is not defined, did you mean [${
              this.constructor.name
            }].state.${member.toString()}?`
          )
        return target[member]
      },
    })
  }

  trigger(Event, data) {
    if (!Event) throw new Error(`The event type is not valid (${Event}).`)
    if (Event.isHistoric())
      throw new Error(
        `${
          Event.name
        } is an historic event which means it cannot be triggered anymore.`
      )
    const args = {
      entityUid: this.uid,
      entityVersion: this.version + 1,
      timestamp: new Date(),
      isBeingReplayed: false,
    }
    Object.assign(args, data)
    const event = new Event(args)
    this._pendingEvents = this._pendingEvents.concat([event])
    this.applyEvent(event)
  }

  applyEvent(event) {
    if (event.entityUid !== this.uid)
      throw new Error('Event Entity UID property must match entity UID')
    if (event.entityVersion <= this.version)
      throw new Error(
        `Event version (${
          event.entityVersion
        }) should be greater than entity version (${this.version})`
      )

    this._handleEvent(event)
    this._version = event.entityVersion
    return this
  }

  openWritableAppliedEventsStream() {
    return new WritableAppliedEventsStream(this)
  }

  clearPendingEvents() {
    this._pendingEvents = []
  }

  _handleEvent(event) {
    const eventHandlerName = `on${event.constructor.name}`
    if (
      eventHandlerName in this &&
      typeof this[eventHandlerName] === 'function'
    ) {
      const result = this[eventHandlerName](event)
      if (result && typeof result.then === 'function')
        throw new Error('This land is pure. Begone foul promise.')
    }
  }
}

module.exports = StatefulEntity
