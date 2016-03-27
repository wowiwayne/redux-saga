import { kTrue, is, remove } from './utils'

export default function emitter() {

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

export function eventChannel(subscribe, name='') {

  const UNDEFINED_INPUT_ERROR = `
    ${name} saga was provided with an undefined input action
    Hints :
    - check that your Action Creator returns a non undefined value
    - if the Saga was started using runSaga, check that your subscribe source provides the action to its listeners
  `

  let cbs = []

  const unsubscribe = subscribe(input => {
    if(input === undefined)
      throw UNDEFINED_INPUT_ERROR

    const arr = cbs.slice()
    for (let i = 0, len = arr.length; i < len; i++) {
      const cb = arr[i]
      if(cb.match(input)) {
        cb(null, input)
        cbs.splice(i, 1)
      }
    }
  })

  function take(pattern, cb) {
    cb.match = matcher(pattern),
    cbs.push(cb)
    cb.cancel = () => remove(cbs, cb)
  }

  return {
    take,
    unsubscribe
  }
}
