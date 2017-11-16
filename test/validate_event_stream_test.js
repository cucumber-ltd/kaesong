'use strict'

const assert = require('assert')
const { Success, Fail } = require('monet')
const arrayToStream = require('../lib/array_to_stream')
const validateEventStream = require('../lib/validate_event_stream')
const { Event } = require('../lib')

const ProjectCreated = class extends Event {} 
const RepoCreated = class extends Event {} 

class SameNumberOfRepoCreatedAndProjectCreatedEvents {
  constructor() {
    this._countRepoCreated = 0
    this._countProjectCreated = 0
  }

  handle(event) {
    if (event instanceof ProjectCreated) this._countProjectCreated++
    if (event instanceof RepoCreated) this._countRepoCreated++
  }

  get result() {
    return this._countProjectCreated === this._countRepoCreated
      ? Success()
      : Fail(
          new Error(
            `Found ${this._countProjectCreated} ProjectCreated and ${this
              ._countRepoCreated} RepoCreated.`
          )
        )
  }
}

const eventAttributes = { entityUid: '1234' , entityVersion: 1 , timestamp: new Date() , isBeingReplayed: false }

describe('validateEventStream', () => {
  it('returns Success when it should', async () => {
    const events = [new RepoCreated(eventAttributes), new ProjectCreated(eventAttributes)]
    const validator = new SameNumberOfRepoCreatedAndProjectCreatedEvents()
    const stream = arrayToStream(events)
    assert((await validateEventStream(stream, validator)).isSuccess())
  })

  it("returns Fail when it the events aren't valid", async () => {
    const events = [new ProjectCreated(eventAttributes)]
    const validator = new SameNumberOfRepoCreatedAndProjectCreatedEvents()
    const stream = arrayToStream(events)
    assert((await validateEventStream(stream, validator)).isFail())
  })
})
