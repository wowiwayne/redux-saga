

export default function createChannel () {
  const putQueue = []
  const takeQueue = []
  let closed

  function put(msg, cb) {
    // putting not allowed on closed channels
    if(closed)
      cb(false)

    // anyone waiting for a message ?
    if (takeQueue.length) {
      // deliver the message to the oldest one waiting (First In First Out)
      const takeCb = takeQueue.shift()
      takeCb(msg)
      cb(true)
    } else {
      // no one is waiting ? queue the event
      putQueue.push([msg, cb])
    }
  }

  // returns a Promise resolved with the next message
  function take(cb) {
    if(closed)
      cb(null)
    // do we have queued messages ?
    if (putQueue.length) {
      // deliver the oldest queued message
      const [msg, putCb] = putQueue.shift()
      cb(msg)
      putCb(true)
    } else {
      // no queued messages ? queue the taker until a message arrives
      takeQueue.push(cb)
    }
  }

  function close() {
    closed = true
    // resume all takers with null
    takeQueue.forEach(takeCb => takeCb(null))
    // resume all putters with false
    /* eslint-disable no-unused-vars */
    putQueue.forEach(([_, putCb]) => putCb(false))
  }

  return {
    take,
    put,
    close,

    __state__: { putQueue, takeQueue }
  }
}
