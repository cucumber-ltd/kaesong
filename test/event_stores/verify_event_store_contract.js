'use strict'

const assert = require('assert')
const uid = require('uuid')
const { define } = require('tdb')
const arrayToStream = require('../../lib/array_to_stream')
const Event = require('../../lib/event')
const make = require('../../test_support/make')

const { deserializeForNamespaces } = require('value-object')
class TestEvent extends Event {}
const deserialize = deserializeForNamespaces([{ TestEvent }])

define(TestEvent).constructWith({
  entityUid: () => uid.v4(),
  timestamp: new Date(),
  isBeingReplayed: false,
  entityVersion: 1,
})

module.exports = function verifyEventStoreContract(factory) {
  describe('EventStore contract', () => {
    let eventStore, stream

    beforeEach(async () => {
      eventStore = factory(deserialize)
      await eventStore.start()
      await eventStore.dropAllEvents()
      stream = eventStore.openWriteEventsStream()
    })

    afterEach(async () => {
      await eventStore.stop()
    })

    it('can handle an empty stream', callback => {
      stream.on('error', callback)
      arrayToStream([])
        .pipe(stream)
        .on('close', callback)
    })

    it('can read stored events for an entity in the order they were written', callback => {
      const entityUid = uid.v4()

      stream.on('error', callback)
      stream.on('close', () => {
        const events = eventStore.findEventsByEntityUid(entityUid)
        const readEvents = []
        events.on('error', callback)
        events.on('data', event => readEvents.push(event))
        events.on('end', () => {
          assert.deepEqual(readEvents, [event1, event3])
          callback()
        })
      })
      const event1 = make(TestEvent).with({ entityUid, entityVersion: 1 })
      const event2 = make(TestEvent).with({ entityUid: uid.v4() })
      const event3 = make(TestEvent).with({ entityUid, entityVersion: 2 })
      arrayToStream([event1, event2, event3]).pipe(stream)
    })

    it('reads all events in order', callback => {
      stream.on('error', callback)
      stream.on('close', () => {
        const events = eventStore.streamAllEvents()
        const readEvents = []
        events.on('error', callback)
        events.on('data', event => readEvents.push(event))
        events.on('end', () => {
          assert.deepEqual(readEvents, [event1, event2, event3])
          callback()
        })
      })

      const event1 = make(TestEvent).with({ entityUid: uid.v4() })
      const event2 = make(TestEvent).with({ entityUid: uid.v4() })
      const event3 = make(TestEvent).with({ entityUid: uid.v4() })
      arrayToStream([event1, event2, event3]).pipe(stream)
    })

    it('rolls back all events when the first writes ok but second fails', callback => {
      stream.once('error', () => {
        const events = eventStore.streamAllEvents()
        const readEvents = []
        events.on('error', callback)
        events.on('data', event => readEvents.push(event))
        events.on('end', () => {
          assert.deepEqual(readEvents, [])
          callback()
        })
      })
      arrayToStream([
        make(TestEvent),
        make(TestEvent).with({ entityUid: 'this is not a valid UUID' }),
      ]).pipe(stream)
    })

    it('tells how many events are stored', callback => {
      stream.on('close', async () => {
        assert.strictEqual(await eventStore.countAllEvents(), 3)
        callback()
      })
      const events = [make(TestEvent), make(TestEvent), make(TestEvent)]
      arrayToStream(events).pipe(stream)
    })
  })
}
