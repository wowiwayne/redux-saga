/* eslint-disable no-unused-vars, no-constant-condition */

import test from 'tape';
import createChannel, { END } from '../../src/internal/channel'

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
      takeQueue: [],
      closed: false
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
      takeQueue: [],
      closed: false
    },
    'channel should not queue takers if there are alread queued messages pending for delivery'
  )


  chan.take(logResult)

  assert.deepEqual(
    actual,
    [1, true, 2, true],
    'channel should not deliver messages if there are no queued takers'
  )

  assert.deepEqual(
    chan.__state__,
    {
      putQueue: [],
      takeQueue: [logResult],
      closed: false
    },
    'channel should queue takers if there are no queued messages'
  )

  chan.put(3, logResult)

  assert.deepEqual(
    actual,
    [1, true, 2, true, 3, true],
    'channel deliver putted messages to pending takers'
  )

  assert.deepEqual(
    chan.__state__,
    {
      putQueue: [],
      takeQueue: [],
      closed: false
    },
    'channel should dequeue existent takers on a new put'
  )

  chan.put(4, logResult)
  const logEnd = v => actual.push('end')
  chan.close(logEnd)

  assert.deepEqual(
    actual,
    [1, true, 2, true, 3, true],
    'channel should not deliver messages if there are no takers'
  )

  assert.deepEqual(
    chan.__state__,
    {
      putQueue: [[4, logResult], [END, logEnd]],
      takeQueue: [],
      closed: true
    },
    'channel should queue END messages'
  )

  chan.put(5, logResult)

  assert.deepEqual(
    actual,
    [1, true, 2, true, 3, true, false],
    'A closed channel should not accept new messages'
  )

  assert.deepEqual(
    chan.__state__,
    {
      putQueue: [[4, logResult], [END, logEnd]],
      takeQueue: [],
      closed: true
    },
    'A closed channel should not accept new messages'
  )


  chan.take(logResult)

  assert.deepEqual(
    actual,
    [1, true, 2, true, 3, true, false, 4, true],
    'A closed channel flush its put queue before delivering END'
  )

  assert.deepEqual(
    chan.__state__,
    {
      putQueue: [[END, logEnd]],
      takeQueue: [],
      closed: true
    },
    'A closed channel flush its put queue before delivering END'
  )

  chan.take(logResult)
  assert.deepEqual(
    actual,
    [1, true, 2, true, 3, true, false, 4, true, END, 'end'],
    'A closed channel should flush END'
  )

  assert.deepEqual(
    chan.__state__,
    {
      putQueue: [],
      takeQueue: [],
      closed: true
    },
    'A closed channel should flush END'
  )

  chan.take(logResult)
  assert.deepEqual(
    actual,
    [1, true, 2, true, 3, true, false, 4, true, END, 'end', END],
    'A closed channel should always deliver END after flushing'
  )

  assert.deepEqual(
    chan.__state__,
    {
      putQueue: [],
      takeQueue: [],
      closed: true
    },
    'A closed channel should always deliver END after flushing'
  )

  assert.end()

})
