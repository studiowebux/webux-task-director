import { AsyncQueue, JobResponse } from '../src/index';

function exampleSyncTask<JobResponse>(id: number, item: object): JobResponse {
  if (Math.floor(Math.random() * 2) == 1) throw new Error('[ERR] not lucky...');
  else {
    return item as JobResponse;
  }
}

const asyncQueue = new AsyncQueue(1, 3, 5000);

const intervalStatus = setInterval(() => {
  console.log(asyncQueue.getStatus());
}, 2500);

for (let i = 0; i < 10000; i++) {
  asyncQueue
    .enqueue<JobResponse>(i, () => exampleSyncTask(i, { foo: 'sync bar' }))
    .then(({ id, result, executionTime, retries }) => {
      const success = `Task Id ${id}, ${JSON.stringify(
        result
      )} finished in ${executionTime}ms with ${retries} retries`;
      console.log(success);
    })
    .catch((error) => {
      console.log(error.message);
    })
    .finally(() => {
      clearInterval(intervalStatus);
    });
}
