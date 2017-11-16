'use strict'

const assert = require('assert')
const getEnv = require('../lib/get_env')

describe('getEnv', () => {
  it('returns default value based on NODE_ENV', () => {
    assert.equal(getEnv('probably_not_defined', { test: 'hello' }), 'hello')
  })

  it('allows null default values', () => {
    assert.equal(getEnv('probably_not_defined', { test: null }), null)
  })

  it('returns default also when the key is null', () => {
    assert.equal(getEnv(null, { test: 'hello' }), 'hello')
  })

  it('does not return default value when env var is defined', () => {
    assert.notEqual(getEnv('PATH', { test: 'hello' }), 'hello')
  })

  it('throws error when no default', () => {
    try {
      getEnv('probably_not_defined', { production: 'hello' })
      throw new Error('expected error')
    } catch (err) {
      assert.equal(
        err.message,
        "Environment variable 'probably_not_defined' required when NODE_ENV=test"
      )
    }
  })
})
