'use strict'

const assert = require('assert')
const makeReadOnlyProxy = require('../lib/read_only_proxy')
const assertThrows = require('../test_support/assert_throws')

describe('makeReadOnlyProxy', () => {
  class FooStore {
    constructor() {
      this._foos = {}
    }

    async getFooById(id) {
      return this._foos[id]
    }

    async getSomethingThatAlwaysThrows() {
      throw new Error('Oh noes')
    }

    async exists(id) {
      return id in this._foos
    }

    async storeFoo(foo) {
      this._foos[foo.id] = foo
    }
  }

  it('exposes read methods', async () => {
    const store = new FooStore()
    const proxy = makeReadOnlyProxy(store)
    const foo = { id: 123 }
    await store.storeFoo(foo)
    assert(await proxy.exists(123))
  })

  it('throws when attempting to call write methods', () => {
    const store = new FooStore()
    const proxy = makeReadOnlyProxy(store)
    assertThrows(
      () => proxy.storeFoo({ id: 666 }),
      "Attempted to call write method 'storeFoo' on read-only proxy"
    )
  })

  it("throws when the method does't exist", () => {
    class Wtf {}
    assertThrows(
      () => makeReadOnlyProxy(new Wtf()).getterThatDoesNotExist(),
      "No such method 'Wtf#getterThatDoesNotExist'"
    )
  })

  it('throws when unsure whether a method is read or write', function() {
    class Wtf {
      async wassup() {
        return 'yeah'
      }
    }
    assertThrows(
      () => makeReadOnlyProxy(new Wtf()).wassup(),
      "Cannot determine if 'wassup' is a read or write method"
    )
  })

  it('rethrows when calling a getter that throws', () => {
    const store = new FooStore()
    const proxy = makeReadOnlyProxy(store)
    assertThrows(() => proxy.getSomethingThatAlwaysThrows(), 'Oh noes')
  })

  it('proxies methods from parent classes', function() {
    class BarStore {
      async start() {
        this._started = true
      }
    }
    class BarChildStore extends BarStore {}
    const store = new BarChildStore()
    const proxy = makeReadOnlyProxy(store)
    proxy.start()
    assert(store._started)
  })
})
