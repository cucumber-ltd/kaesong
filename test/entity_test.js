'use strict'

const assert = require('assert')
const assertThrows = require('../test_support/assert_throws')
const { Entity, Event } = require('../lib')

describe('Entity', () => {
  let lastOnTestEventHandlerEvent

  beforeEach(() => (lastOnTestEventHandlerEvent = null))

  class TestEvent extends Event {}
  TestEvent.properties = { a: 'string' }

  class HistoricTestEvent extends TestEvent.Historic {}

  class TestEntity extends Entity {
    onTestEvent(event) {
      lastOnTestEventHandlerEvent = event
    }
  }

  it('requires a uid', () => {
    assert.throws(() => {
      new TestEntity()
    }, /Missing UID/)
  })

  it('has an initial version of 0', () => {
    const entity = new TestEntity('entity-uid')
    assert.equal(entity.version, 0)
  })

  describe('#trigger()', () => {
    it('instantiates events and stores them triggered pending events', () => {
      const entity = new TestEntity('entity-uid')
      entity.trigger(TestEvent, { a: 'hello' })

      assert.equal(entity.pendingEvents.length, 1)
      const event = entity.pendingEvents[0]
      assert.equal(event.constructor, TestEvent)
      assert.equal(event.entityUid, 'entity-uid')
      assert.equal(event.entityVersion, 1)
      assert.equal(event.timestamp.constructor, Date)
      assert.equal(event.a, 'hello')
    })

    it('applies triggered events', () => {
      const entity = new TestEntity('entity-uid')
      const data = { a: 'hello' }
      entity.trigger(TestEvent, data)
      assert.equal(lastOnTestEventHandlerEvent.constructor, TestEvent)
      assert.equal(lastOnTestEventHandlerEvent.entityUid, 'entity-uid')
      assert.equal(lastOnTestEventHandlerEvent.entityVersion, 1)
      assert.equal(lastOnTestEventHandlerEvent.a, 'hello')
    })

    it('does not allow historic events', () => {
      const entity = new TestEntity('entity-uid')
      assertThrows(
        () => entity.trigger(HistoricTestEvent, { a: 'a' }),
        'HistoricTestEvent is an historic event which means it cannot be triggered anymore.',
        Error
      )
    })

    it('throws when the event constructor is falsy', () => {
      const entity = new TestEntity('entity-uid')
      assertThrows(
        () => entity.trigger(undefined, { a: 'a' }),
        'The event type is not valid (undefined).',
        Error
      )
    })
  })

  describe('#applyEvent()', () => {
    it('applies events by calling event handlers based on their conventional name', () => {
      const entity = new TestEntity('entity-uid')
      const event = new TestEvent({
        entityUid: 'entity-uid',
        entityVersion: 3,
        timestamp: new Date(),
        a: 'hello',
        isBeingReplayed: false,
      })
      entity.applyEvent(event)
      assert.equal(lastOnTestEventHandlerEvent, event)
    })

    it('throws if the event handler returns a promise', () => {
      const entity = new TestEntity('entity-uid')
      const event = new TestEvent({
        entityUid: 'entity-uid',
        entityVersion: 3,
        timestamp: new Date(),
        a: 'hello',
        isBeingReplayed: false,
      })
      entity.onTestEvent = () => Promise.resolve()
      assertThrows(
        () => entity.applyEvent(event),
        'This land is pure. Begone foul promise.',
        Error
      )
    })

    it('sets the version of the entity when applying an event', () => {
      const entity = new TestEntity('entity-uid')
      const event = new TestEvent({
        entityUid: 'entity-uid',
        entityVersion: 4,
        timestamp: new Date(),
        a: 'hello',
        isBeingReplayed: false,
      })
      entity.applyEvent(event)
      assert.equal(entity.version, 4)
    })

    it('rejects events with entity version not greater than the current entity version', () => {
      const entity = new TestEntity('entity-uid')
      const event1 = new TestEvent({
        entityUid: 'entity-uid',
        entityVersion: 3,
        timestamp: new Date(),
        a: 'hello',
        isBeingReplayed: false,
      })
      const event2 = new TestEvent({
        entityUid: 'entity-uid',
        entityVersion: 3,
        timestamp: new Date(),
        a: 'hello',
        isBeingReplayed: false,
      })
      entity.applyEvent(event1)

      assertThrows(
        () => entity.applyEvent(event2),
        'Event version (3) should be greater than entity version (3)',
        Error
      )
    })

    it('rejects events with a non-matching entity UID', () => {
      const entity = new TestEntity('entity-uid')
      const event = new TestEvent({
        entityUid: 'other-entity-uid',
        entityVersion: 3,
        timestamp: new Date(),
        a: 'hello',
        isBeingReplayed: false,
      })

      assertThrows(
        () => entity.applyEvent(event),
        'Event Entity UID property must match entity UID',
        Error
      )
    })

    it('exposes a writable stream to apply events', () => {
      const entity = new TestEntity('entity-uid')
      const stream = entity.openWritableAppliedEventsStream()
      const event = new TestEvent({
        entityUid: 'entity-uid',
        entityVersion: 3,
        timestamp: new Date(),
        a: 'hello',
        isBeingReplayed: false,
      })
      stream.write(event)
      assert.equal(lastOnTestEventHandlerEvent, event)
    })
  })
})
