import { AsyncQueue, CustomJobResponse } from '../src/index';
import { writeFileSync } from 'node:fs';
import { exec } from 'node:child_process';

async function exampleShellTask(id: number): Promise<string> {
  const max = 500;
  const min = 50;
  // Randomized example task duration
  const timeout = Math.floor(Math.random() * (max - min) + min);

  const interval = setInterval(() => {
    console.log(`Task Id ${id} is still running...`);
  }, 2500);

  const cmd = 'time curl -s -S https://webuxlab.com';

  return new Promise<string>((resolve, reject) => {
    clearInterval(interval);
    exec(cmd, { timeout }, (err, stdout, stderr) => {
      clearInterval(interval);
      if (err) {
        return reject(err);
      } else if (stderr) {
        // oops
      }
      return resolve(stdout);
    });
  });
}

const asyncQueue = new AsyncQueue(1, 3, 30000);

const intervalStatus = setInterval(() => {
  console.log(asyncQueue.getStatus());
}, 2500);

for (let i = 0; i < 10; i++) {
  asyncQueue
    .enqueue<CustomJobResponse<string>>(i, () => exampleShellTask(i))
    .then(({ id, result, executionTime, retries }) => {
      const success = `Task Id ${id}, ${result} finished in ${executionTime}ms with ${retries} retries`;
      console.log(success);
      writeFileSync('logs.txt', success + '\n', { flag: 'a' });
    })
    .catch((error) => {
      console.error(error);
      writeFileSync('logs.txt', error.message + '\n', { flag: 'a' });
    })
    .finally(() => {
      clearInterval(intervalStatus);
    });
}
