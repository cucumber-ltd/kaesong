'use strict'

const sinon = require('sinon')
const sleep = require('../lib/sleep')
const written = require('../lib/written')
const arrayToStream = require('../lib/array_to_stream')
const MethodInvokingStream = require('../lib/method_invoking_stream')

describe('MethodInvokingStream', () => {
  let target

  beforeEach(() => {
    target = { on: sinon.spy(async () => {}) }
  })

  it('invokes `on` with the event on the target', async () => {
    const stream = new MethodInvokingStream(target)

    arrayToStream(['event-1', 'event-2']).pipe(stream)
    await written(stream)

    sinon.assert.calledTwice(target.on)
    sinon.assert.callOrder(
      target.on.withArgs('event-1'),
      target.on.withArgs('event-2')
    )
  })

  it('@async does not call event handlers after it was ended', async () => {
    const pendings = []
    const target = {
      on: sinon.spy(async () => new Promise(resolve => pendings.push(resolve))),
    }
    const eventStream = arrayToStream(['event-1', 'event-2'])
    const stream = new MethodInvokingStream(target)
    const streaming = written(stream)
    eventStream.pipe(stream)
    await sleep(5)

    stream.end()
    pendings[0]()
    await streaming
    sinon.assert.calledOnce(target.on)
  })
})
