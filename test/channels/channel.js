/* eslint-disable no-unused-vars, no-constant-condition */

import test from 'tape';
import createChannel from '../../src/internal/channel'

const delay = ms => new Promise(r => setTimeout(r, ms))

test('channel take', assert => {
  //assert.plan(1)

  const chan = createChannel()

  const actual = []
  const logResult = v => actual.push(v)

  // put 2 messages
  for (var i = 1; i <= 2; i++) {
    chan.put(i, logResult)
  }

  assert.deepEqual(
    chan.__state__,
    {
      putQueue: [[1, logResult], [2, logResult]],
      takeQueue: []
    },
    'channel should queue putted messages if there are no takers'
  )

  chan.take(logResult)
  chan.take(logResult)

  assert.deepEqual(
    actual,
    [1, true, 2, true],
    'channel should deliver queued messages to new takers'
  )

  assert.deepEqual(
    chan.__state__,
    {
      putQueue: [],
      takeQueue: []
    },
    'channel should not queue takers if there are alread queued messages pending for delivery'
  )


  chan.take(logResult)
  chan.take(logResult)

  assert.deepEqual(
    actual,
    [1, true, 2, true],
    'channel not deliver messages if there are no queued messages'
  )

  assert.deepEqual(
    chan.__state__,
    {
      putQueue: [],
      takeQueue: [logResult, logResult]
    },
    'channel should queue takers if there are no queued messages'
  )

  // put 2 messages
  chan.put(3, logResult)

  assert.deepEqual(
    actual,
    [1, true, 2, true, 3, true],
    'channel deliver putted messages to the oldest queued taker'
  )

  assert.deepEqual(
    chan.__state__,
    {
      putQueue: [],
      takeQueue: [logResult]
    },
    'channel should queue takers if there are no queued messages'
  )


  assert.end()

})
