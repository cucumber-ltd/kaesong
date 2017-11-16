'use strict'
const assert = require('assert')
const { Writable } = require('stream')
const makeTransformStream = require('../lib/make_transform_stream')
const written = require('../lib/written')
const arrayToStream = require('../lib/array_to_stream')
const connectStreamsWithPipes = require('../lib/connect_streams_with_pipes')

describe('connectStreamsWithPipes', () => {
  it('connects a source to a destination through connections in order', async () => {
    const trace = ['source']
    const source = arrayToStream([trace])
    const destination = new Writable({
      objectMode: true,
      highWaterMark: 0,
      write: function(object, _, callback) {
        object.push('destination')
        callback()
      },
    })
    const connections = [
      makeTransformStream(({ object: trace, push }) => {
        trace.push('1')
        push(trace)
      }),
      makeTransformStream(({ object: trace, push }) => {
        trace.push('2')
        push(trace)
      }),
    ]

    await written(connectStreamsWithPipes({ source, destination, connections }))

    assert.deepEqual(trace, ['source', '1', '2', 'destination'])
  })
})
