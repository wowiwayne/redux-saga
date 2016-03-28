/* eslint-disable no-constant-condition */

import { take, put, call, fork, race } from 'redux-saga/effects'
import { END } from 'redux-saga/utils'
import { INCREMENT_ASYNC, INCREMENT, CANCEL_INCREMENT_ASYNC } from '../actionTypes'

const action = type => ({type})

const countdown = (secs) => {
  return {
    subscribe(listener) {
      const iv = setInterval(() => {
        secs -= 1
        if(secs > 0)
          listener(secs)
        else {
          listener(END)
          clearInterval(iv)
        }
      }, 1000);
      return () => clearInterval(iv)
    }
  }
}

export function* incrementAsync({value}) {
  const obs = yield call(countdown, value)
  let ev = yield take(obs)
  while(ev !== END) {
    yield put({type: INCREMENT_ASYNC, value: ev})
    ev = yield take(obs)
  }
  yield put(action(INCREMENT))
}

export function* watchIncrementAsync() {
  let action
  while((action = yield take(INCREMENT_ASYNC))) {
    // starts a 'Race' between an async increment and a user cancel action
    // if user cancel action wins, the incrementAsync will be cancelled automatically
    yield race([
      call(incrementAsync, action),
      take(CANCEL_INCREMENT_ASYNC)
    ])
  }
}

export default function* rootSaga() {
  yield fork(watchIncrementAsync)
}
