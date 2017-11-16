'use strict'

const assert = require('assert')
const assertThrows = require('../test_support/assert_throws')
const eventually = require('../lib/eventually')
const CommandBus = require('../lib/command_bus')
const sleep = require('../lib/sleep')

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

  it('lets you wait until the commands were handled and the events were persisted', async () => {
    const { runningCommand } = await commandBus.dispatch(new TestSlowCommand())
    await runningCommand
    assert.equal(committedUnitsOfWork.length, 1)
  })

  it('@async rejects the running command when committing fails', async () => {
    domainRepository.commit = () => {
      throw new Error('commit fails')
    }
    const { runningCommand } = await commandBus.dispatch(new TestFastCommand())
    await assertThrows(async () => await runningCommand, 'commit fails')
  })

  it('@async lets you wait for the command handler to reject', async () => {
    const { runningCommand } = await commandBus.dispatch(new FailingCommand())
    await assertThrows(() => runningCommand, null, Error)
  })
})
