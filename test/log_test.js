'use strict'

const assert = require('assert')
const Log = require('../lib/log')

describe('log', () => {
  it('generates a log name that includes file name', () => {
    const [logTag, logPath] = Log.name(__filename).split(':')
    assert.equal(logTag, 'kaesong')
    assert(__filename.endsWith(logPath))
  })
})
