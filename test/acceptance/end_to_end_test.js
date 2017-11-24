const assert = require("assert")
const uuid = require('uuid/v4')

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
    person.trigger(PersonCreatedEvent, { name })
    return person
  }
}

// Commands

class CreatePerson extends ValueObject.define({ personUid: 'string', name: 'string' }) {
  static async handler(domainRepository, unitOfWork, { personUid, name }) {
    const person = Person.create({ personUid, name })
    unitOfWork.add(person)
    await domainRepository.commit(unitOfWork)
  }
}

class MovePerson extends ValueObject.define({ personUid: 'string', x: 'number', y: 'number' }) {
  static async handler(domainRepository, unitOfWork, { personUid, x, y }) {
    const person = await domainRepository.loadEntityByUid(Person, personUid)
    person.moveTo({ x, y })
    await domainRepository.commit(unitOfWork)
  }
}

// Events

class PersonCreatedEvent extends Event {
}

PersonCreatedEvent.properties = { name: 'string' }

const name = 'Lucy'
const personUid = uuid()

describe('Kaesong', () => {
  xit('updates a read model when a command is dispatched', async () => {
    const domainEventBus = new DomainEventBus()
    const eventStore = new MemoryEventStore()
    await eventStore.start()
    const domainRepository = new DomainRepository(domainEventBus, eventStore)
    const commandBus = new CommandBus(domainRepository)
    // TODO: Don't require this registration, commandBus should default to command.constructor.handler
    commandBus.registerCommandHandler(CreatePerson, CreatePerson.handler)
    commandBus.registerCommandHandler(MovePerson, MovePerson.handler)

    const locations = new Map()

    // When
    const { runningCommand: createPerson } = await commandBus.dispatch(new CreatePerson({ personUid, name }))
    await createPerson

    const { runningCommand: movePerson } = await commandBus.dispatch(new MovePerson({ personUid, x: 10, y: 20 }))
    await movePerson

    // Then
    assert.equal(locations.get('Lucy'), { x: 10, y: 20 })
  })
})