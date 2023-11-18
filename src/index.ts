import CustomError from './Error';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Resolver = (value: any) => any | void;

export type Job = {
  id: number;
  task: GenericTask | Task;
  resolve: Resolver;
  reject: (value: Error) => void;
  retries: number;
  startTime?: number;
};

export type JobResponse = {
  id: number;
  result: object;
  retries: number;
  executionTime: number;
  startTime?: number;
};

export type CustomJobResponse<T> = {
  id: number;
  result: T;
  retries: number;
  executionTime: number;
  startTime?: number;
};

export type GenericTask = <T>() => T | PromiseLike<T>;
export type Task = () => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Logger = { log: (i0: any, ...i1: any[]) => void };

export class AsyncQueue {
  queue: Job[];
  running: number;
  concurrencyLimit: number;
  retryLimit: number;
  taskTimeout: number;
  logger: Logger | Console;

  constructor(
    concurrencyLimit = 3,
    retryLimit = 3,
    taskTimeout = 5000,
    logger: Logger | Console = console
  ) {
    this.queue = [];
    this.running = 0;
    this.concurrencyLimit = concurrencyLimit;
    this.retryLimit = retryLimit;
    this.taskTimeout = taskTimeout;
    this.logger = logger;
  }

  async enqueue<T>(id: number, task: Task): Promise<T> {
    this.logger.log({
      level: 'debug',
      message: `Adding Task Id: ${id} to Queue`
    });
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ id, task, resolve, reject, retries: 0 });
      this.logger.log({
        level: 'verbose',
        message: `Task Id: ${id} Added to Queue`
      });
      this.run();
    });
  }

  async run(): Promise<JobResponse | undefined> {
    if (this.running < this.concurrencyLimit && this.queue.length > 0) {
      const { id, task, resolve, reject, retries, startTime } =
        this.queue.shift() || {};
      this.logger.log({
        level: 'debug',
        message: `Running Task Id: ${id}`
      });
      if (
        task == null ||
        resolve == null ||
        reject == null ||
        id == null ||
        retries == null
      )
        throw new CustomError('Invalid task received', 'TASK_INVALID', 500);
      this.running++;
      const runStartTime = startTime || Date.now();

      let timer = null;
      try {
        const result = await Promise.race([
          task(),
          new Promise(
            (_, taskReject) =>
              (timer = setTimeout(
                () =>
                  taskReject(
                    new CustomError(
                      `Task Id ${id} timeout after ${this.taskTimeout}ms`,
                      'TASK_TIMEOUT',
                      500
                    )
                  ),
                this.taskTimeout
              ))
          )
        ]);
        const endTime = Date.now();
        this.running--;
        this.logger.log({
          level: 'debug',
          message: `Task Id: ${id} Completed with Success`
        });
        resolve({
          id,
          result,
          executionTime: endTime - runStartTime,
          retries,
          startTime: runStartTime
        });
      } catch (error) {
        let message = 'Unknown Error';
        if (error instanceof Error) message = error.message;

        this.running--;
        if (retries < this.retryLimit) {
          this.logger.log({
            level: 'debug',
            message: `Retrying Task Id: ${id}`
          });
          this.queue.unshift({
            id,
            task,
            resolve,
            reject,
            retries: retries + 1,
            startTime: runStartTime
          });
        } else {
          this.logger.log({
            level: 'debug',
            message: `Task Id: ${id} Failed`
          });
          reject(
            new CustomError(
              `Task Id ${id}, ${message} failed in ${
                Date.now() - runStartTime
              }ms with ${retries} retries`,
              'TASK_FAILED',
              500
            )
          );
        }
      } finally {
        if (timer) {
          clearTimeout(timer);
          this.logger.log({
            level: 'verbose',
            message: `Task Id: ${id} Timer cancellation successful`
          });
        }
      }
      return this.run();
    }
  }

  getStatus() {
    return {
      queueLength: this.queue.length,
      runningTasks: this.running
    };
  }
}
