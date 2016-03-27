import test from 'tape';
import proc from '../../src/internal/proc'
import emitter from '../../src/internal/emitter'
import * as io from '../../src/effects'


test('processor take from default observable', assert => {
  assert.plan(1);

  let actual = [];
  const input = (cb) => {
    Promise.resolve(1)
      .then(() => cb({type: 'action-*'}))
      .then(() => cb({type: 'action-1'}))
      .then(() => cb({type: 'action-2'}))
      .then(() => cb({isAction: true}))
      .then(() => cb({type: 'action-3'}))
    return () => {}
  }

  function* genFn() {
    actual.push( yield io.take('action-*') )
    actual.push( yield io.take('action-1') )
    actual.push( yield io.take(['action-2', 'action-2222']) )
    actual.push( yield io.take(a => a.isAction) )
    actual.push( yield io.take('action-2222') )
  }

  proc(genFn(), input).done.catch(err => assert.fail(err))

  const expected = [{type: 'action-*'}, {type: 'action-1'}, {type: 'action-2'}, {isAction: true}];

  setTimeout(() => {
    assert.deepEqual(actual, expected,
      "processor must fullfill take Effects from default observable"
    );
    assert.end();
  }, 0)

});


test('processor take from provided observable', assert => {
  assert.plan(1);

  const observable = emitter()
  let actual = [];
  const end = {}

  Promise.resolve(1)
    .then(() => observable.emit({type: 'action-*'}))
    .then(() => observable.emit({type: 'action-1'}))
    .then(() => observable.emit({type: 'action-2'}))
    .then(() => observable.emit({isAction: true}))
    .then(() => observable.emit({type: 'action-3'}))
    .then(() => observable.emit(end))


  function* genFn() {
    actual.push( yield io.take(observable, 'action-*') )
    actual.push( yield io.take(observable, 'action-1') )
    actual.push( yield io.take(observable, ['action-2', 'action-2222']) )
    actual.push( yield io.take(observable, a => a.isAction) )
    actual.push( yield io.take(observable, 'action-2222') )
  }

  proc(genFn()).done.catch(err => assert.fail(err))

  const expected = [{type: 'action-*'}, {type: 'action-1'}, {type: 'action-2'}, {isAction: true}];

  setTimeout(() => {
    assert.deepEqual(actual, expected,
      "processor must fullfill take Effects from a provided observable"
    );
    assert.end();
  }, 0)

});
