'use strict'

const assert = require('assert')
const uuid = require('uuid/v4')
const ValueObject = require('value-object')
const immutable = require('immutable')
const eventually = require('./eventually')
const CommandBus = require('./command_bus')
const StatefulEntity = require('./stateful_entity')
const Event = require('./event')
const DomainRepository = require('./domain_repository')
const DomainEventBus = require('./domain_event_bus')
const MemoryEventStore = require('./event_stores/memory_event_store')

describe('Plutonium', () => {
  const lucyName = 'Lucy'
  const seanName = 'Sean'
  const lucyUid = uuid()
  const seanUid = uuid()

  let locationsReadModel, messagesHeardReadModel, commandBus

  beforeEach(async () => {
    locationsReadModel = new Map()
    messagesHeardReadModel = new Map()
    const locationsProjector = new LocationsProjector(locationsReadModel)
    const messagesHeardProjector = new MessagesHeardProjector(
      messagesHeardReadModel
    )
    const domainEventBus = new DomainEventBus()
    const eventStore = new MemoryEventStore()
    const domainRepository = new DomainRepository(domainEventBus, eventStore)

    commandBus = new CommandBus(domainRepository)
    // TODO: Don't require this registration, commandBus should default to command.constructor.handler
    commandBus.registerCommandHandler(CreatePerson, CreatePerson.handler)
    commandBus.registerCommandHandler(MovePerson, MovePerson.handler)
    commandBus.registerCommandHandler(ShoutMessage, ShoutMessage.handler)
    commandBus.registerCommandHandler(HearMessage, HearMessage.handler)

    await eventStore.start()
    domainEventBus.connectProjector(locationsProjector)
    domainEventBus.connectProjector(messagesHeardProjector)
    domainEventBus.connectSagas({ Sagas, commandBus })
  })

  it('updates a read model when a command is dispatched', async () => {
    // Given
    await commandBus.dispatch(
      new CreatePerson({ personUid: lucyUid, name: lucyName })
    )

    // When
    await commandBus.dispatch(
      new MovePerson({ personUid: lucyUid, x: 10, y: 20 })
    )

    // Then
    await eventually(() => {
      assert.deepEqual(locationsReadModel.get('Lucy'), { x: 10, y: 20 })
    })
  })

  it('dispatches commands on related entities using a saga', async () => {
    const message = 'Hi, Sean!'

    // Given
    await commandBus.dispatch(
      new CreatePerson({ personUid: lucyUid, name: lucyName })
    )
    await commandBus.dispatch(
      new MovePerson({ personUid: lucyUid, x: 10, y: 20 })
    )
    await commandBus.dispatch(
      new CreatePerson({ personUid: seanUid, name: seanName })
    )
    await commandBus.dispatch(
      new MovePerson({ personUid: seanUid, x: 0, y: 0 })
    )

    // When
    await commandBus.dispatch(
      new ShoutMessage({ personUid: lucyUid, message: message })
    )

    // Then
    await eventually(
      () =>
        assert.deepEqual(messagesHeardReadModel.get(seanName), [
          { message, from: lucyName },
        ]),
      null,
      50,
      5
    )
  })
})

class Person extends StatefulEntity {
  static create({ personUid, name }) {
    const person = new this(personUid)
    person.trigger(PersonCreated, { name })
    return person
  }

  constructor(uid) {
    super(uid)
    this.state = new immutable.Map({ name: null, location: null })
  }

  moveTo({ x, y }) {
    const name = this.state.get('name')
    this.trigger(PersonMoved, { name, x, y })
  }

  shout({ message }) {
    const { x, y } = this.state.get('location')
    this.trigger(MessageShouted, { message, x, y })
  }

  hear({ message, fromUid }) {
    this.trigger(MessageHeard, { message, fromUid })
  }

  onPersonCreated({ name }) {
    this.state = this.state.set('name', name)
  }

  onPersonMoved({ x, y }) {
    this.state = this.state.set('location', { x, y })
  }
}

// Commands

class CreatePerson extends ValueObject.define({
  personUid: 'string',
  name: 'string',
}) {
  static async handler(entity, { personUid, name }) {
    entity.create(Person, { personUid, name })
  }
}

class MovePerson extends ValueObject.define({
  personUid: 'string',
  x: 'number',
  y: 'number',
}) {
  static async handler(entity, { personUid, x, y }) {
    const person = await entity(Person, personUid)
    person.moveTo({ x, y })
  }
}

class ShoutMessage extends ValueObject.define({
  personUid: 'string',
  message: 'string',
}) {
  static async handler(entity, { personUid, message }) {
    const person = await entity(Person, personUid)
    person.shout({ message })
  }
}

class HearMessage extends ValueObject.define({
  personUid: 'string',
  message: 'string',
  fromUid: 'string',
}) {
  static async handler(entity, { personUid, message, fromUid }) {
    const person = await entity(Person, personUid)
    person.hear({ message, fromUid })
  }
}

// Events

class PersonCreated extends Event.define({ name: 'string' }) {}
class PersonMoved extends Event.define({
  name: 'string',
  x: 'number',
  y: 'number',
}) {}
class MessageShouted extends Event.define({
  message: 'string',
  x: 'number',
  y: 'number',
}) {}
class MessageHeard extends Event.define({
  message: 'string',
  fromUid: 'string',
}) {}

// Projectors
class LocationsProjector {
  constructor(locationsReadModel) {
    this._locationsReadModel = locationsReadModel
  }

  targets() {
    return [this]
  }

  onPersonCreated({ name }) {
    this._locationsReadModel.set(name, null)
  }

  onPersonMoved({ name, x, y }) {
    this._locationsReadModel.set(name, { x, y })
  }
}

class MessagesHeardProjector {
  constructor(messagesHeardReadModel) {
    this._messagesHeardReadModel = messagesHeardReadModel
    this._namesByPersonUids = new Map()
  }

  targets() {
    return [this]
  }

  onPersonCreated({ name, entityUid: personUid }) {
    this._namesByPersonUids.set(personUid, name)
    this._messagesHeardReadModel.set(name, [])
  }

  onMessageHeard({ message, entityUid: personUid, fromUid }) {
    const listenerName = this._namesByPersonUids.get(personUid)
    const from = this._namesByPersonUids.get(fromUid)
    this._messagesHeardReadModel.get(listenerName).push({ message, from })
  }
}

// Sagas
const RANGE = 1000
const Sagas = {
  DeliversShoutsInRange: class DeliversShoutsInRange {
    static isStartedBy(event) {
      return event instanceof PersonCreated
    }

    constructor({ commandBus }) {
      this._commandBus = commandBus
    }

    onPersonCreated({ entityUid: personUid }) {
      if (this._personUid) return
      this._personUid = personUid
    }

    onPersonMoved({ entityUid: personUid, x, y }) {
      if (this._personUid !== personUid) return
      this._location = { x, y }
    }

    async onMessageShouted({ entityUid: personUid, message, x, y }) {
      if (this._personUid === personUid) return
      if (this._inRange({ x, y }))
        await this._commandBus.dispatch(
          new HearMessage({
            personUid: this._personUid,
            message,
            fromUid: personUid,
          })
        )
    }

    _inRange({ x, y }) {
      const distanceSquared =
        (this._location.x - x) ** 2 + (this._location.y - y) ** 2
      return distanceSquared <= RANGE ** 2
    }
  },
}
