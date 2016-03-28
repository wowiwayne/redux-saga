import { kTrue, is, check, remove } from './utils'

export const END = {type: '@@redux-saga/CHANNEL_END'}

export function emitter() {

  const cbs = []

  function subscribe(cb) {
    cbs.push(cb)
    return () => remove(cbs, cb)
  }

  function emit(item) {
    cbs.slice().forEach(cb => cb(item))
  }

  return {
    subscribe,
    emit
  }
}

const matchers = {
  wildcard  : () => kTrue,
  default   : pattern => input => input.type === pattern,
  array     : patterns => input => patterns.some( p => p === input.type ),
  predicate : predicate => input => predicate(input)
}

function matcher(pattern) {
  return (
      pattern === '*'   ? matchers.wildcard
    : is.array(pattern) ? matchers.array
    : is.func(pattern)  ? matchers.predicate
    : matchers.default
  )(pattern)
}

export const MSG_AFTER_END_ERROR = `channel was provided an action after being closed`
export const UNDEFINED_INPUT_ERROR = `
  channel was provided with an undefined action
  Hints :
  - check that your Action Creator returns a non undefined value
  - if the Saga was started using runSaga, check that your subscribe source provides the action to its listeners
`

export function channel() {

  let closed = false
  let cbs = []
  //const log = () => console.log(cbs.map(cb => cb.pattern))

  function put(input) {
    //log()
    if(input === undefined)
      input = new Error(UNDEFINED_INPUT_ERROR)
    else if(closed)
      input = new Error(MSG_AFTER_END_ERROR)

    const isError = input instanceof Error
    closed = input === END || isError
    if(closed) {
      const arr = cbs
      cbs = null
      for (let i = 0, len = arr.length; i < len; i++) {
        arr[i](isError ? input : null, isError ? null : input)
      }
    }

    else {
      const arr = cbs
      cbs = []
      for (let i = 0, len = arr.length; i < len; i++) {
        const cb = arr[i]
        if(cb.match(input)) {
          cb(null, input)
        } else
          cbs.push(cb)
      }
    }
    //log()
  }

  function take(pattern, cb) {
    check(cb, is.func, 'channel\'s take 2nd argument must be a function')
    if(closed)
      return cb(null, END)
    cb.match = matcher(pattern)
    cb.pattern = pattern
    cbs.push(cb)
    cb.cancel = () => remove(cbs, cb)
  }

  return {
    take,
    put,
    close: () => put(END)
  }
}

export function eventChannel(subscribe) {
  const chan = channel()
  const unsubscribe = subscribe(chan.put)
  return {
    take: chan.take,
    unsubscribe
  }
}
