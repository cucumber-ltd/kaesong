'use strict'

const assert = require('assert')
const sinon = require('sinon')
const pipeEventsTo = require('../test_support/pipe_events_to')
const SagaStream = require('../lib/saga_stream')
const ValueObject = require('value-object')

describe('SagaStream', () => {
  const FINISH_PAYLOAD = 'finished'
  let sagaStream, startEvent, sagaCreated, handledEvents, injectedParam

  class SomethingHappened extends ValueObject.define({ payload: 'string' }) {}

  class TestSaga {
    constructor({ terminate, injectedParam }) {
      sagaCreated = true
      this._terminate = terminate
      this._injectedParam = injectedParam
    }

    async onSomethingHappened(event) {
      handledEvents.push(event)
      this._injectedParam(event.payload)
      if (event.payload === FINISH_PAYLOAD) this._terminate()
    }
  }

  beforeEach(() => {
    handledEvents = []
    sagaCreated = false
    injectedParam = sinon.spy()
    sagaStream = new SagaStream({
      Saga: TestSaga,
      isStartedBy: event => event === startEvent,
      params: { injectedParam }
    })
    startEvent = new SomethingHappened({ payload: 'started' })
  })

  it('starts a new saga when isStartedBy accepts the event', async () => {
    await pipeEventsTo({
      events: [startEvent],
      stream: sagaStream,
    })
    assert(sagaCreated)
  })

  it('does not start a new saga when isStartedBy rejects the event', async () => {
    await pipeEventsTo({
      events: [new SomethingHappened({ payload: 'rejected' })],
      stream: sagaStream,
    })
    assert(!sagaCreated)
  })

  it('streams the start event to the newly-created saga', async () => {
    await pipeEventsTo({
      events: [startEvent],
      stream: sagaStream,
    })
    assert.deepEqual(handledEvents, [startEvent])
  })

  it('streams subsequent events to the saga', async () => {
    const nextEvent = new SomethingHappened({ payload: 'after' })
    await pipeEventsTo({
      events: [startEvent, nextEvent],
      stream: sagaStream,
    })
    assert.deepEqual(handledEvents, [startEvent, nextEvent])
  })

  it('does not stream previous events to the saga', async () => {
    const previousEvent = new SomethingHappened({ payload: 'before' })
    await pipeEventsTo({
      events: [previousEvent, startEvent],
      stream: sagaStream,
    })
    assert.deepEqual(handledEvents, [startEvent])
  })

  it('does not write events after the saga has terminated', async () => {
    const finishEvent = new SomethingHappened({ payload: FINISH_PAYLOAD })
    const otherEvent = new SomethingHappened({ payload: 'after' })
    await pipeEventsTo({
      events: [startEvent, finishEvent, otherEvent],
      stream: sagaStream,
    })
    assert.deepEqual(handledEvents, [startEvent, finishEvent])
  })

  it('can start a new saga after the last one has finished (and does not pause itself when the last saga is terminated/unpiped)', async () => {
    const finishEvent = new SomethingHappened({ payload: FINISH_PAYLOAD })
    const otherEvent = new SomethingHappened({ payload: 'after' })
    await pipeEventsTo({
      events: [
        startEvent,
        finishEvent,
        otherEvent,
        startEvent,
        finishEvent,
        otherEvent,
      ],
      stream: sagaStream,
    })
    assert.deepEqual(handledEvents, [
      startEvent,
      finishEvent,
      startEvent,
      finishEvent,
    ])
  })

  it('constructs a saga with the injected params', async () => {
    const nextEvent = new SomethingHappened({ payload: 'after' })
    await pipeEventsTo({
      events: [startEvent, nextEvent],
      stream: sagaStream,
    })
    sinon.assert.calledWith(injectedParam, 'after')
  })
})
