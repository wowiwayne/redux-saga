import { combineReducers } from 'redux'
import { counter, countdown } from './counter'
import congratulate from './congratulate'

const rootReducer = combineReducers({
  countdown,
  counter,
  congratulate
})

export default rootReducer
