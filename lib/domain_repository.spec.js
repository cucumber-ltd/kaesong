'use strict'

const assert = require('assert')
const Stream = require('stream')
const uid = require('uuid')
const {
  DomainRepository,
  DomainEventBus,
  Event,
  Entity,
  UnitOfWork,
} = require('../lib')
const arrayToStream = require('./array_to_stream')
const { MemoryEventStore } = require('./event_stores')
const { NoSuchEntityError } = require('./errors')
const ReplayFinished = require('./replay_finished')
const assertThrows = require('../test_support/assert_throws')

class TestEventA extends Event {}
class TestEventB extends Event {}

class TestEntity extends Entity {
  doA() {
    this.trigger(TestEventA, {})
  }
  doB() {
    this.trigger(TestEventB, {})
  }
}

describe('DomainRepository', () => {
  let entityUid, domainEventBus, eventStore, domainRepository, entity

  beforeEach(async () => {
    entityUid = uid.v4()
    domainEventBus = new DomainEventBus()
    eventStore = new MemoryEventStore()
    await eventStore.start()
    domainRepository = new DomainRepository(domainEventBus, eventStore)
    entity = new TestEntity(entityUid)
  })

  it('commits events from a unit of work and pushes them to the event bus', async () => {
    const projectedEvents = []
    const projection = Stream.Writable({
      objectMode: true,
      write: (event, _, cb) => {
        projectedEvents.push(event)
        cb()
      },
    })
    domainEventBus.pipe(projection)
    entity.doA()
    entity.doB()
    entity.doA()

    const unitOfWork = new UnitOfWork()
    unitOfWork.add(entity)

    await domainRepository.commit(unitOfWork)
    assert.deepEqual(projectedEvents.map(event => event.constructor), [
      TestEventA,
      TestEventB,
      TestEventA,
    ])
  })

  it('fails to commit when the EventStore fails to write events', async () => {
    const event = new TestEventA({
      entityUid: 'bad-uid-will-fail-to-store',
      entityVersion: 1,
      timestamp: new Date(),
      isBeingReplayed: false,
    })
    const unitOfWork = { getAllEventsStream: () => arrayToStream([event]) }

    await assertThrows(
      () => domainRepository.commit(unitOfWork),
      'Not a uid: bad-uid-will-fail-to-store'
    )
  })

  it("doesn't push any events to the event bus when some of the unit of work events fail to be committed", async () => {
    const projectedEvents = []
    const projection = Stream.Writable({
      objectMode: true,
      write: (event, _, cb) => {
        projectedEvents.push(event)
        cb()
      },
    })
    domainEventBus.pipe(projection)

    const unitOfWork = {
      getAllEventsStream: () =>
        arrayToStream([
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
        ]),
    }

    await assertThrows(() => domainRepository.commit(unitOfWork))
    assert.deepEqual(projectedEvents, [])
  })

  it('rejects with an error when trying to load non-existent entity', async () => {
    await assertThrows(
      () => domainRepository.loadEntityByUid(Entity, entityUid),
      `No events found for entityUid "${entityUid}"`,
      NoSuchEntityError
    )
  })

  it('loads an entity', async () => {
    entity.doA()
    const unitOfWork = new UnitOfWork()
    unitOfWork.add(entity)

    await domainRepository.commit(unitOfWork)
    const loadedEntity = await domainRepository.loadEntityByUid(
      TestEntity,
      entityUid
    )
    assert.equal(loadedEntity.uid, entityUid)
  })

  it('replays all events', async () => {
    domainEventBus.resume()
    const projectedEvents = []
    const projector = Stream.Writable({
      objectMode: true,
      write: (event, _, cb) => {
        projectedEvents.push(event)
        cb()
      },
    })

    entity.doA()
    entity.doB()
    entity.doA()

    const unitOfWork = new UnitOfWork()
    unitOfWork.add(entity)

    await domainRepository.commit(unitOfWork)
    domainEventBus.pipe(projector)
    await domainRepository.replayAllEvents()
    assert.deepEqual(projectedEvents.map(event => event.constructor), [
      TestEventA,
      TestEventB,
      TestEventA,
      ReplayFinished,
    ])
  })

  describe('caching', () => {
    it('reuses a previous instance of an entity', async () => {
      entity.doA()
      const unitOfWork = new UnitOfWork()
      unitOfWork.add(entity)

      await domainRepository.commit(unitOfWork)
      const previouslyLoadedEntity = await domainRepository.loadEntityByUid(
        TestEntity,
        entityUid
      )
      const loadedEntity = await domainRepository.loadEntityByUid(
        TestEntity,
        entityUid
      )
      assert.equal(loadedEntity, previouslyLoadedEntity)
    })

    it('updates the cached entity on commit', async () => {
      domainEventBus.resume()

      entity.doA()
      const unitOfWork = new UnitOfWork()
      unitOfWork.add(entity)
      await domainRepository.commit(unitOfWork)

      const previouslyLoadedEntity = await domainRepository.loadEntityByUid(
        TestEntity,
        entityUid
      )
      assert.equal(previouslyLoadedEntity.version, 1)

      previouslyLoadedEntity.doA()
      const unitOfWork2 = new UnitOfWork()
      unitOfWork2.add(previouslyLoadedEntity)
      await domainRepository.commit(unitOfWork2)

      const loadedEntity = await domainRepository.loadEntityByUid(
        TestEntity,
        entityUid
      )
      assert.equal(loadedEntity.version, 2)
      assert.equal(loadedEntity, previouslyLoadedEntity)
      assert.equal(await eventStore.countAllEvents(), 2)
    })
  })

  it('rejects with an error when trying to load an entity with an unloadable event', async () => {
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

    await assertThrows(
      () => domainRepository.loadEntityByUid(Entity, entityUid),
      'Error in transform'
    )
  })
})
