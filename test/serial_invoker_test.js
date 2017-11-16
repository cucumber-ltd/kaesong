'use strict'

const sinon = require('sinon')
const assertThrows = require('../test_support/assert_throws')
const Event = require('../lib/event')
const SerialInvoker = require('../lib/serial_invoker')

class TestEvent extends Event {}

const badHandler = () => {
  throw new Error('eek')
}

const event = new TestEvent({
  entityUid: 'uid',
  entityVersion: 1,
  timestamp: new Date(),
  isBeingReplayed: false,
})

describe('SerialInvoker', () => {
  it('calls event handlers on targets in series', async () => {
    const handler1 = sinon.spy()
    const handler2 = sinon.spy()
    const targets = [{ onTestEvent: handler2 }, { onTestEvent: handler1 }]
    const invoker = new SerialInvoker(targets, { shouldRaiseErrors: false })

    await invoker.on(event)

    sinon.assert.callOrder(handler2.withArgs(event), handler1.withArgs(event))
  })

  it('logs errors in the handler when told not to raise errors', async () => {
    const consoleError = sinon.spy()
    const targets = [
      {
        onTestEvent: badHandler,
      },
    ]
    const invoker = new SerialInvoker(targets, {
      shouldRaiseErrors: false,
      consoleError,
    })

    await invoker.on(event)

    sinon.assert.called(consoleError)
  })

  it('calls handler on subsequent targets when told not to raise errors', async () => {
    const consoleError = sinon.spy()
    const handler = sinon.spy()
    const targets = [{ onTestEvent: badHandler }, { onTestEvent: handler }]
    const invoker = new SerialInvoker(targets, {
      shouldRaiseErrors: false,
      consoleError,
    })

    await invoker.on(event)

    sinon.assert.called(handler)
  })

  it('raises errors in the handler when told to raise errors', async () => {
    const targets = [
      {
        onTestEvent: badHandler,
      },
    ]
    const invoker = new SerialInvoker(targets, {
      shouldRaiseErrors: true,
    })

    await assertThrows(() => invoker.on(event), 'eek', Error)
  })
})
