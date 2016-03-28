import test from 'tape'

import { runSaga } from '../src'
import { take, select } from '../src/effects'
import { emitter } from '../src/internal/channel'

test('runSaga', assert => {
  assert.plan(1)

  const em = emitter()
  let actual = []
  let action

  em.subscribe(input => action = input)

  const getState = () => action
  const typeSelector = a => a.type


  Promise.resolve(1)
    .then(() => em.emit({type: 'ACTION-0'}))
    .then(() => em.emit({type: 'ACTION-1'}))
    .then(() => em.emit({type: 'ACTION-2'}))

  function* gen() {
    actual.push( yield take('ACTION-0') )
    actual.push( yield select(typeSelector) )
    actual.push( yield take('ACTION-1') )
    actual.push( yield select(typeSelector) )
    actual.push( yield take('ACTION-2') )
    actual.push( yield select(typeSelector) )
  }

  const task = runSaga(gen(), {
    subscribe: em.subscribe, dispatch: () => {}, getState
  })

  const expected = [
    {type: 'ACTION-0'}, 'ACTION-0',
    {type: 'ACTION-1'}, 'ACTION-1',
    {type: 'ACTION-2'}, 'ACTION-2'
  ]

  task.done.then(() =>
    assert.deepEqual(actual, expected,
      'runSaga must connect the provided iterator to the provided IO'
    )
  )

  task.done.catch(err => assert.fail(err))

})
