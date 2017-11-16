'use strict'

const verifyContract = require('./verify_event_store_contract')
const MemoryEventStore = require('../../lib/event_stores/memory_event_store')

describe('MemoryEventStore', () => {
  verifyContract(() => new MemoryEventStore())
})
