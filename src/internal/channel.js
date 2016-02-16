import { noop } from './utils'

export const END = Symbol('END')

export default function createChannel () {
  let putQueue = []
  let takeQueue = []
  let closed = false

  function put(msg, cb = noop) {
    // putting not allowed on closed channels
    if(closed)
      return cb(false)

    if(msg === END) {
      // do not allow more puts
      closed = true
    }

    // anyone waiting for a message ?
    if (takeQueue.length) {
      if(msg === END) {
        // END is a broadcast message
        takeQueue.forEach(takeCb => takeCb(END))
        takeQueue = []
      } else {
        // deliver the message to the oldest one waiting (First In First Out)
        const takeCb = takeQueue.shift()
        takeCb(msg)
      }
      cb(true)
    }
    // no one is waiting ? queue the event/putter
    else {
      putQueue.push([msg, cb])
    }
  }

  // returns a Promise resolved with the next message
  function take(cb = noop) {
    // do we have queued messages ?
    if (putQueue.length) {
      // deliver the oldest queued message
      const [msg, putCb] = putQueue.shift()
      cb(msg)
      putCb(true)
    } else {
      // no queued messages ?
      if(closed) {
        cb(END)
      } else {
        // queue the taker until a message arrives
        takeQueue.push(cb)
      }
    }
  }

  function close(cb = noop) {
    if(closed)
      return cb(false)

    // one more put
    put(END, cb)
  }

  return {
    take,
    put,
    close,
    /* a debug untility */
    get __state__(){
      return { putQueue, takeQueue, closed }
    }
  }
}
