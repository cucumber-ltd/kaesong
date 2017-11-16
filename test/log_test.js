'use strict'

const assert = require('assert')
const Log = require('../lib/log')

describe('log', () => {
  it('generates a log name that includes file name', () => {
    assert.equal(Log.name(__filename), 'kaesong:test/log_test.js')
  })
})
