# Recipes

## Throttling

你可以在 watcher Saga 內放置一個 delay，對一連串被 dispatch 的 action 節流。例如，假設當使用者在輸入框輸入文字時，UI 觸發一個 `INPUT_CHANGED` action。

```javascript
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

function* handleInput(input) {
  // ...
}

function* watchInput() {
  while (true) {
    const { input } = yield take('INPUT_CHANGED')
    yield fork(handleInput, input)
    // 阻塞 500 毫秒
    yield call(delay, 500)
  }
}
```

透過在 `fork` 後放置一個 delay，`watchInput` 將被阻塞 500 毫秒，在這期間所有發生的 `INPUT_CHANGED` 都會被忽略。這是確保 Saga 在每 500 毫秒內只 dispatch 一個 `INPUT_CHANGED` action。

但是在上面的程式碼還有一些問題。在 take 一個 action 之後，`watchInput` 將休眠 500 毫秒，意思說它在這個期間，將忽略所有發生的 action。這也許是 throttle（節流） 的目的，但是注意到 watcher 將也忽略 trailer action：例如最後一個 action 最後可能發生在這 500 毫秒內。如果你在輸入欄位 throttle 輸入的 action，這可能是不好的，因為你可能要到最後 500 毫秒 throttle 延遲過去才能反應最後的輸入。

這裡是一個 track trailing action 更詳細的版本︰

```javascript
function* watchInput(wait) {
  let lastAction
  let lastTime = Date.now()
  let countDown = 0 // 處理 leading action

  while (true) {
    const winner = yield race({
      action: take('INPUT_CHANGED'),
      timeout: countDown ? call(delay, countDown) : null
    })
    const now = Date.now()
    countDown -= (now - lastTime)
    lastTime = now

    if (winner.action) {
      lastAction = winner.action
    }
    if (lastAction && countDown <= 0) {
      yield fork(worker, lastAction)
      lastAction = null
      countDown = wait
    }
  }
}
```

在這個新版本，我們管理一個 `countDown` 變數來 track 剩下的 timeout。初始的 `countDown` 是 0，因為我們想要處理第一個 action。在處理完第一個 action 後，`countDown` 將被設定 throttle 期間的 `wait`。意思是我在處理下一個 action 之前，至少需要 `wait` 毫秒。

然後在每次迭代時，我們在下一個最後的 action 和剩餘的 timeout 啟動一個 race。現在我們不會錯過任何的 action，我們保持 track 最後一個 `lastAction` 變數，我們也更新 `countDown` 和剩餘的 timeout。

`if (lastAction && countDown <= 0) {...}` 區塊確保我們在 throttle 期間過期了（如果 `countDown` 小於等於 0），還可以處理最後的 trailing action（如果 `lastAction` 不是 null 或 undefined）。處理完 action 後，我們重置 `lastAction` 和 `countDown`，所以我們現在等待另一個 `wait` 毫秒期間，其他的 action 來處理它。

## Debouncing

To debounce a sequence, put the `delay` in the forked task:

```javascript

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

function* handleInput(input) {
  // debounce by 500ms
  yield call(delay, 500)
  ...
}

function* watchInput() {
  let task
  while (true) {
    const { input } = yield take('INPUT_CHANGED')
    if (task) {
      yield cancel(task)
    }
    task = yield fork(handleInput, input)
  }
}
```

在上面的範例，`handleInput` 在執行邏輯之前等待 500 毫秒。如果使用者在這個期間輸入了一些文字我們將得到更多 `INPUT_CHANGED` action。由於 `handleInput` 將被阻塞在 `delay`，透過 `watchInput` 在執行它的邏輯之前被取消。

上面的範例可以使用 redux-saga 的 `takeLatest` help 重新撰寫：

```javascript

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

function* handleInput({ input }) {
  // debounce by 500ms
  yield call(delay, 500)
  ...
}

function* watchInput() {
  // 將取消目前執行的 handleInput task
  yield* takeLatest('INPUT_CHANGED', handleInput);
}
```

## 嘗試 XHR 呼叫

為了嘗試指定次數的 XHR 呼叫，使用一個 for 迴圈和 delay：

```javascript

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

function* updateApi(data) {
  for(let i = 0; i < 5; i++) {
    try {
      const apiResponse = yield call(apiRequest, { data });
      return apiResponse;
    } catch(err) {
      if(i < 5) {
        yield call(delay, 2000);
      }
    }
  }
  // 嘗試 10 秒後失敗
  throw new Error('API request failed');
}

export default function* updateResource() {
  while (true) {
    const { data } = yield take('UPDATE_START');
    try {
      const apiResponse = yield call(updateApi, data);
      yield put({
        type: 'UPDATE_SUCCESS',
        payload: apiResponse.body,
      });
    } catch (error) {
      yield put({
        type: 'UPDATE_ERROR',
        error
      });
    }
  }
}

```

在上面的範例，`apiRequest` 將重新嘗試五次，在這之間每次延遲兩秒。After the 5th failure, 在第五次失敗後，透過父 saga 將取得例外，我們將 dispatch `UPDATE_ERROR` action。

如果你不想要限制重新嘗試，你可以將 `for` 回圈替換成 `while (true)`。將 `take` 替換成 `takeLatest`，所以只嘗試最後一次的請求。在錯誤處理加入一個 `UPDATE_RETRY` action ，我們可以通知使用者更新沒有成功，但是它會重新嘗試。

```javascript
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

function* updateApi(data) {
  while (true) {
    try {
      const apiResponse = yield call(apiRequest, { data });
      return apiResponse;
    } catch(error) {
      yield put({
        type: 'UPDATE_RETRY',
        error
      })
      yield call(delay, 2000);
    }
  }
}

function* updateResource({ data }) {
  const apiResponse = yield call(updateApi, data);
  yield put({
    type: 'UPDATE_SUCCESS',
    payload: apiResponse.body,
  });
}

export function* watchUpdateResource() {
  yield* takeLatest('UPDATE_START', updateResource);
}

```
