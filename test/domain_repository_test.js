'use strict'

const assert = require('assert')
const Stream = require('stream')
const uid = require('uuid')
const {
  DomainRepository,
  DomainEventBus,
  Event,
  Entity,
} = require('../lib')
const arrayToStream = require('../lib/array_to_stream')
const { MemoryEventStore } = require('../lib/event_stores')
const { NoSuchEntityError } = require('../lib/errors')
const ReplayFinished = require('../lib/replay_finished')

const assertError = require('../test_support/assert_error')

class TestEventA extends Event {}
class TestEventB extends Event {}

describe('DomainRepository', () => {
  describe('with a MemoryEventStore', () => {
    let domainEventBus, eventStore

    beforeEach(async () => {
      domainEventBus = new DomainEventBus()
      eventStore = new MemoryEventStore()
      await eventStore.start()
    })

    it('commits events from a unit of work and pushes them to the event bus', () => {
      const domainRepository = new DomainRepository(domainEventBus, eventStore)
      const projectedEvents = []
      const projection = Stream.Writable({
        objectMode: true,
        write: (event, _, cb) => {
          projectedEvents.push(event)
          cb()
        },
      })
      domainEventBus.pipe(projection)

      const events = [
        new TestEventA({
          entityUid: uid.v4(),
          entityVersion: 1,
          timestamp: new Date(),
          isBeingReplayed: false,
        }),
        new TestEventB({
          entityUid: uid.v4(),
          entityVersion: 1,
          timestamp: new Date(),
          isBeingReplayed: false,
        }),
        new TestEventA({
          entityUid: uid.v4(),
          entityVersion: 1,
          timestamp: new Date(),
          isBeingReplayed: false,
        }),
      ]
      const unitOfWork = { getAllEventsStream: () => arrayToStream(events) }

      return domainRepository
        .commit(unitOfWork)
        .then(() => assert.deepEqual(projectedEvents, events))
    })

    it('@async fails to commit when the EventStore fails to write events', () => {
      const domainRepository = new DomainRepository(domainEventBus, eventStore)
      const event = new TestEventA({
        entityUid: 'bad-uid-will-fail-to-store',
        entityVersion: 1,
        timestamp: new Date(),
        isBeingReplayed: false,
      })
      const unitOfWork = { getAllEventsStream: () => arrayToStream([event]) }

      return domainRepository.commit(unitOfWork).then(
        () => {
          throw new Error(
            'This should have failed because the EventStore failed to write'
          )
        },
        err => assertError(err, 'Not a uid: bad-uid-will-fail-to-store', Error)
      )
    })

    it("@async doesn't push any events to the event bus when some of the unit of work events fail to be committed", () => {
      const domainRepository = new DomainRepository(domainEventBus, eventStore)
      const projectedEvents = []
      const projection = Stream.Writable({
        objectMode: true,
        write: (event, _, cb) => {
          projectedEvents.push(event)
          cb()
        },
      })
      domainEventBus.pipe(projection)

      const events = [
        new TestEventA({
          entityUid: uid.v4(),
          entityVersion: 1,
          timestamp: new Date(),
          isBeingReplayed: false,
        }),
        new TestEventB({
          entityUid: 'bad-uid-will-fail-to-store',
          entityVersion: 1,
          timestamp: new Date(),
          isBeingReplayed: false,
        }),
        new TestEventA({
          entityUid: uid.v4(),
          entityVersion: 1,
          timestamp: new Date(),
          isBeingReplayed: false,
        }),
      ]
      const unitOfWork = { getAllEventsStream: () => arrayToStream(events) }

      return domainRepository
        .commit(unitOfWork)
        .then(() => {
          throw new Error('Expected commit() to fail')
        })
        .catch(() => assert.deepEqual(projectedEvents, []))
    })

    it('@async rejects with an error when trying to load non-existent entity', () => {
      const entityUid = uid.v4()

      const domainRepository = new DomainRepository(domainEventBus, eventStore)

      return domainRepository.loadEntityByUid(Entity, entityUid).then(
        () => {
          throw new Error(
            `This should have failed because there are no events for entityUid ${entityUid}`
          )
        },
        err =>
          assertError(
            err,
            `No events found for entityUid "${entityUid}"`,
            NoSuchEntityError
          )
      )
    })

    it('@async loads an entity', () => {
      const dr = new DomainRepository(domainEventBus, eventStore)

      const entityUid = uid.v4()
      const event = new TestEventA({
        entityUid,
        entityVersion: 1,
        timestamp: new Date(),
        isBeingReplayed: false,
      })
      const unitOfWork = { getAllEventsStream: () => arrayToStream([event]) }

      class MyEntity extends Entity {
        onTestEventA(event) {
          this.entityUid = event.entityUid
        }
      }

      return dr
        .commit(unitOfWork)
        .then(() => dr.loadEntityByUid(MyEntity, entityUid))
        .then(entity => assert.equal(entity.entityUid, entityUid))
    })

    it('@async replays all events', () => {
      const domainRepository = new DomainRepository(domainEventBus, eventStore)
      const projectedEvents = []
      const projection = Stream.Writable({
        objectMode: true,
        write: (event, _, cb) => {
          projectedEvents.push(event)
          cb()
        },
      })
      domainEventBus.pipe(projection)

      const events = [
        new TestEventA({
          entityUid: uid.v4(),
          entityVersion: 1,
          timestamp: new Date(),
          isBeingReplayed: false,
        }),
        new TestEventB({
          entityUid: uid.v4(),
          entityVersion: 1,
          timestamp: new Date(),
          isBeingReplayed: false,
        }),
        new TestEventA({
          entityUid: uid.v4(),
          entityVersion: 1,
          timestamp: new Date(),
          isBeingReplayed: false,
        }),
      ]
      const unitOfWork = { getAllEventsStream: () => arrayToStream(events) }

      const expectedReplayedEvents = events.map(event =>
        event.with({ isBeingReplayed: true })
      )
      const expectedEvents = events
        .concat(expectedReplayedEvents)
        .concat([new ReplayFinished()])

      return domainRepository
        .commit(unitOfWork)
        .then(() => domainRepository.replayAllEvents())
        .then(() => assert.deepEqual(projectedEvents, expectedEvents))
    })
  })

  it('@async rejects with an error when trying to load an entity with an unloadable event', () => {
    const entityUid = uid.v4()

    const domainEventBus = new DomainEventBus()
    const eventStore = {
      findEventsByEntityUid: () =>
        arrayToStream('some bogus event').pipe(
          new Stream.Transform({
            objectMode: true,
            // This simulates the situation when an event can't be deserialized,
            // perhaps because its type no longer exists
            transform: (data, _, cb) => cb(new Error('Error in transform')),
          })
        ),
    }
    const domainRepository = new DomainRepository(domainEventBus, eventStore)

    return domainRepository.loadEntityByUid(Entity, entityUid).then(
      () => {
        throw new Error(
          'This should have failed because of the error in transform'
        )
      },
      err => {
        assertError(err, 'Error in transform', Error)
      }
    )
  })
})
