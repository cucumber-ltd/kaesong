'use strict'

const verifyContract = require('./verify_event_store_contract')
const MemoryEventStore = require('.././event_stores/memory_event_store')

describe('MemoryEventStore', () => {
  verifyContract(() => new MemoryEventStore())
})
