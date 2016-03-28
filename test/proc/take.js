import test from 'tape';
import proc from '../../src/internal/proc'
import { emitter, channel, END } from '../../src/internal/channel'
import * as io from '../../src/effects'



test('processor take from default channel', assert => {
  assert.plan(1);

  let actual = [];
  const input = (cb) => {
    Promise.resolve(1)
      .then(() => cb({type: 'action-*'}))
      .then(() => cb({type: 'action-1'}))
      .then(() => cb({type: 'action-2'}))
      .then(() => cb({type: 'unnoticeable-action'}))
      .then(() => cb({isAction: true}))
      .then(() => cb(END))
    return () => {}
  }

  function* genFn() {
    actual.push( yield io.take() ) // take all actions
    actual.push( yield io.take('action-1') ) // take only actions of type 'action-1'
    actual.push( yield io.take(['action-2', 'action-2222']) ) // take either type
    actual.push( yield io.take(a => a.isAction) ) // take if match predicate
    actual.push( yield io.take('never-happening-action') ) //  should get END
  }

  proc(genFn(), input).done.catch(err => assert.fail(err))

  const expected = [{type: 'action-*'}, {type: 'action-1'}, {type: 'action-2'}, {isAction: true}, END];

  setTimeout(() => {
    assert.deepEqual(actual, expected,
      "processor must fullfill take Effects from default channel"
    );
    assert.end();
  }, 0)

});

test('processor take from provided channel', assert => {
  assert.plan(1);

  const chan = channel()
  let actual = [];

  const closedP = Promise.resolve()
    .then(() => chan.put({type: 'action-1'}))
    .then(() => chan.put({type: 'action-2'}))
    .then(() => chan.put({type: 'unnoticeable-action'}))
    .then(() => chan.put({type: 'action-3'}))
    .then(() => chan.close())


  function* genFn() {
    actual.push( yield io.take(chan, 'action-1') )
    actual.push( yield io.take(chan, 'action-2') )
    actual.push( yield io.take(chan, 'action-3') )
    actual.push( yield io.take(chan, 'never-happening-action') )
    yield closedP
    actual.push( yield io.take() ) // taking on a closed channel should return END
  }

  proc(genFn()).done.catch(err => assert.fail(err))

  const expected = [{type: 'action-1'}, {type: 'action-2'}, {type: 'action-3'}, END];

  setTimeout(() => {
    assert.deepEqual(actual, expected,
      "processor must fullfill take Effects from a provided channel"
    );
    assert.end();
  }, 0)

});

test('processor take from provided event channel', assert => {
  assert.plan(1);

  const observable = emitter()
  let actual = [];

  Promise.resolve(1)
    .then(() => observable.emit({type: 'action-1'}))
    .then(() => observable.emit({type: 'action-2'}))
    .then(() => observable.emit({type: 'action-3'}))
    .then(() => observable.emit(END))

  function* genA() {
    actual.push( yield io.take(observable, ['action-2', 'action-2222']) )
    actual.push( yield io.take(observable, 'never-happening-action') )
  }

  function* genB() {
    actual.push( yield io.take(observable, 'action-1') )
    actual.push( yield io.take(observable, 'action-3') )
    actual.push( yield io.take(observable, 'never-happening-action') )
  }

  proc(genA()).done.catch(err => assert.fail(err))
  proc(genB()).done.catch(err => assert.fail(err))

  const expected = [{type: 'action-1'}, {type: 'action-2'}, {type: 'action-3'}, END, END];

  setTimeout(() => {
    assert.deepEqual(actual, expected,
      "processor must fullfill take Effects from a provided event channel"
    );
    assert.end();
  }, 0)

});

test('processor handle Error messages', assert => {
  assert.plan(1);

  let actual = [];
  const input = (cb) => {
    Promise.resolve(1)
      .then(() => cb({type: 'action'}))
      .then(() => cb({type: 'action'}))
      .then(() => cb(new Error('error')))
    return () => {}
  }

  const forever = true
  function* genFn() {
    try {
      while(forever) {
        const action = yield io.take('action')
        actual.push(action)
        if(action === END)
          break
      }
    } catch(err) {
      actual.push(err.message)
    }
  }



  proc(genFn(), input).done.catch(err => assert.fail(err))

  const expected = [{type: 'action'}, {type: 'action'}, 'error'];

  setTimeout(() => {
    assert.deepEqual(actual, expected,
      "processor must abort all takers on Error"
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

  function* genA() {
    actual.push( yield io.take(observable, ['action-2', 'action-2222']) )
    actual.push( yield io.take(observable, a => a.isAction) )
  }

  function* genB() {
    actual.push( yield io.take(observable, 'action-*') )
    actual.push( yield io.take(observable, 'action-1') )
    actual.push( yield io.take(observable, 'action-2222') )
  }

  proc(genA()).done.catch(err => assert.fail(err))
  proc(genB()).done.catch(err => assert.fail(err))

  const expected = [{type: 'action-*'}, {type: 'action-1'}, {type: 'action-2'}, {isAction: true}];

  setTimeout(() => {
    assert.deepEqual(actual, expected,
      "processor must fullfill take Effects from a provided observable"
    );
    assert.end();
  }, 0)

});
