'use strict'

const assert = require('assert')
const { Entity, Event, UnitOfWork } = require('../lib')

class TestEntity extends Entity {}
class TestEvent extends Event {}

describe('UnitOfWork', () => {
  it('exposes pending events from its added entities, sorted chronologically', () => {
    const unitOfWork = new UnitOfWork()
    const entity1 = new TestEntity('entity1-uid')
    const entity2 = new TestEntity('entity2-uid')
    entity2.trigger(TestEvent, {})
    entity1.trigger(TestEvent, {})
    entity2.trigger(TestEvent, {})
    entity1.trigger(TestEvent, {})
    unitOfWork.add(entity1, entity2)
    assert.deepEqual(unitOfWork.getAllEvents(), [
      entity2.pendingEvents[0],
      entity1.pendingEvents[0],
      entity2.pendingEvents[1],
      entity1.pendingEvents[1],
    ])
  })
})
