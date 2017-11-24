const assert = require("assert")
const { Writable } = require('stream')
const uuid = require('uuid/v4')

const eventually = require('../../lib/eventually')
const CommandBus = require("../../lib/command_bus")
const Entity = require("../../lib/entity")
const Event = require("../../lib/event")
const ValueObject = require('value-object')
const DomainRepository = require("../../lib/domain_repository")
const DomainEventBus = require("../../lib/domain_event_bus")
const MemoryEventStore = require("../../lib/event_stores/memory_event_store")

class Person extends Entity {
  static create({ personUid, name }) {
    const person = new this(personUid)
    person.trigger(PersonCreated, { name })
    return person
  }

  onPersonCreated({ name }) {
    this._name = name
  }

  moveTo({ x, y }) {
    const name = this._name
    this.trigger(PersonMoved, { name, x, y })
  }
}

// Commands

class CreatePerson extends ValueObject.define({ personUid: 'string', name: 'string' }) {
  static async handler(domainRepository, unitOfWork, { personUid, name }) {
    const person = Person.create({ personUid, name })
    unitOfWork.add(person)
  }
}

class MovePerson extends ValueObject.define({ personUid: 'string', x: 'number', y: 'number' }) {
  static async handler(domainRepository, unitOfWork, { personUid, x, y }) {
    const person = await domainRepository.loadEntityByUid(Person, personUid)
    person.moveTo({ x, y })
    unitOfWork.add(person)
  }
}

// Events

class PersonCreated extends Event {
}
PersonCreated.properties = { name: 'string' }

class PersonMoved extends Event {
}
PersonMoved.properties = { name: 'string', x: 'number', y: 'number' }

// Projectors
class LocationsProjector {
  constructor(locationsReadModel) {
    this._locationsReadModel = locationsReadModel
  }

  targets() {
    return [this]
  }

  onPersonCreated({ name }) {
    this._locationsReadModel.set(name, { x: 0, y: 0 })
  }

  onPersonMoved({ name, x, y }) {
    this._locationsReadModel.set(name, { x, y })
  }
}

const name = 'Lucy'
const personUid = uuid()

describe('Kaesong', () => {
  it('updates a read model when a command is dispatched', async () => {
    const locationsReadModel = new Map()
    const locationsProjector = new LocationsProjector(locationsReadModel)

    const domainEventBus = new DomainEventBus()

    domainEventBus.connectProjector(locationsProjector)
    const eventStore = new MemoryEventStore()
    await eventStore.start()
    const domainRepository = new DomainRepository(domainEventBus, eventStore)
    const commandBus = new CommandBus(domainRepository)
    // TODO: Don't require this registration, commandBus should default to command.constructor.handler
    commandBus.registerCommandHandler(CreatePerson, CreatePerson.handler)
    commandBus.registerCommandHandler(MovePerson, MovePerson.handler)

    // When
    await commandBus.dispatch(new CreatePerson({ personUid, name }))
    await commandBus.dispatch(new MovePerson({ personUid, x: 10, y: 20 }))

    // Then
    await eventually(() => {
      assert.deepEqual(locationsReadModel.get('Lucy'), { x: 10, y: 20 })
    })
  })
})