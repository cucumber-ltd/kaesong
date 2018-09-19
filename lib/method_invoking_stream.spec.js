'use strict'

const sinon = require('sinon')
const sleep = require('./sleep')
const { promisify } = require('util')
const pump = promisify(require('pump'))
const arrayToStream = require('./array_to_stream')
const MethodInvokingStream = require('./method_invoking_stream')

describe('MethodInvokingStream', () => {
  let target

  beforeEach(() => {
    target = { on: sinon.spy(async () => {}) }
  })

  it('invokes `on` with the event on the target', async () => {
    await pump(
      arrayToStream(['event-1', 'event-2']),
      new MethodInvokingStream(target)
    )

    sinon.assert.calledTwice(target.on)
    sinon.assert.callOrder(
      target.on.withArgs('event-1'),
      target.on.withArgs('event-2')
    )
  })

  it('does not call event handlers after it was destroyed', async () => {
    const target = {
      on: sinon.spy(async () => {
        await sleep(2)
        stream.destroy()
      }),
    }
    const source = arrayToStream(['event-1', 'event-2', 'event 3'])
    const stream = new MethodInvokingStream(target)
    const streaming = pump(source, stream)
    await sleep(5)
    await streaming
    sinon.assert.calledOnce(target.on)
  })
})
