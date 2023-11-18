import { AsyncQueue, JobResponse } from '../src/index';
import { writeFileSync } from 'node:fs';

async function exampleTask<JobResponse>(
  id: number,
  item: object
): Promise<JobResponse> {
  const max = 5000;
  const min = 0;
  // Randomized example task duration
  const timeout = Math.floor(Math.random() * (max - min) + min);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      clearTimeout(timer);
      if (Math.floor(Math.random() * 2) == 1)
        return reject(new Error('[ERR] not lucky...'));
      else {
        return resolve(item as JobResponse);
      }
    }, timeout);
  });
}

const asyncQueue = new AsyncQueue(10, 3, 5000, { log: () => {} });

for (let i = 0; i < 100; i++) {
  asyncQueue
    .enqueue<JobResponse>(i, () => exampleTask(i, { foo: 'bar' }))
    .then(({ id, result, executionTime, retries }) => {
      const success = `Task Id ${id}, ${JSON.stringify(
        result
      )} finished in ${executionTime}ms with ${retries} retries`;
      writeFileSync('logs.txt', success + '\n', { flag: 'a' });
    })
    .catch((error) => {
      writeFileSync('logs.txt', error.message + '\n', { flag: 'a' });
    });
}
