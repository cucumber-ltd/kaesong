'use strict'

const assert = require('assert')
const eventually = require('../lib/eventually')

describe('@async eventually()', () => {
  it('succeeds with a promise, default delay and default attempt count', () => {
    return eventually(() => Promise.resolve())
  })

  it('fails with a promise', () => {
    return eventually(() => Promise.reject(new Error('KO')), null, 3, 0).then(
      () => {
        throw new Error('Expected to eventually fail, but succeeded')
      },
      err => {} // eslint-disable-line no-unused-vars
    )
  })

  it('succeeds after some failed attempts', () => {
    let remainingFailures = 4
    return eventually(
      () =>
        remainingFailures-- === 0
          ? Promise.resolve()
          : Promise.reject(new Error('KO')),
      null,
      5,
      0
    )
  })

  it('tries to succeed N times before failing', () => {
    let attempts = 0
    const rejectError = new Error('KO')
    return eventually(
      () => {
        attempts++
        return Promise.reject(rejectError)
      },
      null,
      5,
      0
    ).then(
      () => {
        throw new Error('Expected to eventually fail, but succeeded')
      },
      err => {
        assert.equal(err, rejectError)
        if (attempts !== 5)
          throw new Error(`Failed as expected but after ${attempts} attempts`)
      }
    )
  })

  it('fails after N failed attempts', () => {
    let remainingFailures = 6
    return eventually(
      () =>
        remainingFailures-- === 0
          ? Promise.resolve()
          : Promise.reject(new Error('KO')),
      null,
      5,
      0
    ).then(
      () => {
        throw new Error('Expected to eventually fail, but succeeded')
      },
      () => {}
    )
  })

  it('waits between attempts', () => {
    let done = false
    let attempts = 0
    setTimeout(() => (done = true), 40)
    return eventually(
      () => {
        attempts++
        return done ? Promise.resolve() : Promise.reject(new Error('KO'))
      },
      null,
      3,
      20
    ).then(() => assert.equal(attempts, 3))
  })

  it('waits between attempts before failing', () => {
    let done = false
    setTimeout(() => (done = true), 70)
    return eventually(
      () => (done ? Promise.resolve() : Promise.reject(new Error('KO'))),
      null,
      2,
      30
    ).then(
      () => {
        throw new Error('Expected to eventually fail, but succeeded')
      },
      err => {} // eslint-disable-line no-unused-vars
    )
  })

  it('succeeds without promises', () => {
    return eventually(() => {
      /* no-op */
    })
  })

  it('fails without promises', () => {
    return eventually(
      () => {
        throw new Error('KO')
      },
      null,
      3,
      0
    ).then(
      () => {
        throw new Error('Expected to eventually fail, but succeeded')
      },
      err => {} // eslint-disable-line no-unused-vars
    )
  })

  it('succeeds after some failed attempts without promises', () => {
    let remainingFailures = 4
    return eventually(
      () => {
        if (remainingFailures-- === 0) return
        throw new Error('KO')
      },
      null,
      5,
      0
    )
  })

  it("fails straight away when the error doesn't match the pattern", () => {
    let attempts = 0
    return eventually(
      () => {
        attempts++
        throw new Error('ABC')
      },
      /^XYZ$/,
      5,
      0
    ).then(
      () => {
        throw new Error('Expected to fail directly, but succeeded')
      },
      () => {
        if (attempts > 1)
          throw new Error(
            `Expected to fail directly, failed after ${attempts} attempts`
          )
      }
    )
  })

  it('fails after N attempts when the error matches the pattern', () => {
    let attempts = 0
    return eventually(
      () => {
        attempts++
        throw new Error('ABC')
      },
      /^ABC$/,
      5,
      0
    ).then(
      () => {
        throw new Error('Expected to fail directly, but succeeded')
      },
      () => {
        if (attempts !== 5)
          throw new Error(
            `Expected to fail after 5 attempts, failed after ${attempts} attempts`
          )
      }
    )
  })
})
