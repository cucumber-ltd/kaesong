'use strict'

const assert = require('assert')
const Log = require('../lib/log')

describe('log', () => {
  it('generates a log label that includes file name', () => {
    const [logTag, logPath] = Log.label(__filename).split(':')
    assert(__filename.endsWith(logPath))
  })

  it('allows you to set the log tag', () => {
    const [logTag] = Log('cpro').label(__filename).split(':')
    assert.equal(logTag, 'cpro')
  })

  it('defaults to tagging the log name with plutonium', () => {
    const [logTag] = Log.label(__filename).split(':')
    assert.equal(logTag, 'plutonium')
  })
})
