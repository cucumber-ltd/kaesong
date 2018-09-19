'use strict'

const assert = require('assert')
const assertThrows = require('../test_support/assert_throws')
const eventually = require('./eventually')
const CommandBus = require('./command_bus')
const sleep = require('./sleep')

class TestSlowCommand {
  validate() {}
}
class TestFastCommand {
  validate() {}
}
class FailingCommand {
  validate() {}
}

describe('CommandBus', () => {
  let domainRepository, committedUnitsOfWork, sideEffects, commandBus

  beforeEach(() => {
    sideEffects = []
    committedUnitsOfWork = []
    domainRepository = {
      startUnitOfWork: () => {
        return {}
      },

      commit(unitOfWork) {
        committedUnitsOfWork.push(unitOfWork)
      },
    }
    commandBus = new CommandBus(domainRepository)
    commandBus.registerCommandHandler(TestSlowCommand, async () => {
      await sleep(6)
      sideEffects.push('slow')
    })
    commandBus.registerCommandHandler(TestFastCommand, async () => {
      sideEffects.push('fast')
    })
    commandBus.registerCommandHandler(FailingCommand, async () => {
      throw new Error('Some error')
    })
  })

  it('processes commands in sequence', async () => {
    await commandBus.dispatch(new TestSlowCommand())
    await commandBus.dispatch(new TestFastCommand())
    await eventually(() => assert.deepEqual(sideEffects, ['slow', 'fast']))
  })


  it('lets you inject your own promise to wait until the commands were handled and the events were persisted', async () => {
    await new Promise((resolve, reject) => commandBus.dispatch(new TestSlowCommand(), { resolve, reject }))
    assert.equal(committedUnitsOfWork.length, 1)
  })

  it('lets you wait until the commands were handled and the events were persisted', async () => {
    await commandBus.dispatchAndWait(new TestSlowCommand())
    assert.equal(committedUnitsOfWork.length, 1)
  })

  it('rejects the running command when committing fails', async () => {
    domainRepository.commit = () => {
      throw new Error('commit fails')
    }
    await assertThrows(async () => await commandBus.dispatchAndWait(new TestFastCommand(), 'commit fails'))
  })

  it('lets you wait for the command handler to reject', async () => {
    await assertThrows(() => commandBus.dispatchAndWait(new FailingCommand(), null, Error))
  })
})
