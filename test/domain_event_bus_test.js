'use strict'

const assert = require('assert')
const Stream = require('stream')
const arrayToStream = require('../lib/array_to_stream')
const { DomainEventBus } = require('../lib')

class TestEvent {}

describe('DomainEventBus', () => {
  it('broadcasts piped events to other independent piped streams and does not fail on piped stream failures', cb => {
    const domainEventBus = new DomainEventBus()

    let goodProjectionStreamEventCount = 0
    let badProjectionStreamEventCount = 0
    let goodProjectionStreamError = null
    let badProjectionStreamError = null

    const domainEventsStream = arrayToStream([
      new TestEvent(),
      new TestEvent(),
      new TestEvent(),
    ])
    const goodProjectionStream = new Stream.Writable({
      objectMode: true,
      write: (data, _, cb) => {
        goodProjectionStreamEventCount++
        cb()
      },
    })

    const expectedBadProjectionError = new Error('I always fail :(')
    const badProjectionStream = new Stream.Writable({
      objectMode: true,
      write: (data, _, cb) => {
        badProjectionStreamEventCount++
        cb(expectedBadProjectionError)
      },
    })

    badProjectionStream.on('error', err => (badProjectionStreamError = err))
    goodProjectionStream.on('error', err => (goodProjectionStreamError = err))

    goodProjectionStream.on('finish', () => {
      assert(!goodProjectionStreamError)
      assert.equal(goodProjectionStreamEventCount, 3)

      assert.deepEqual(badProjectionStreamError, expectedBadProjectionError)
      assert.equal(badProjectionStreamEventCount, 1)
      cb()
    })

    domainEventsStream.pipe(domainEventBus)
    domainEventBus.pipe(badProjectionStream)
    domainEventBus.pipe(goodProjectionStream)
  })
})
