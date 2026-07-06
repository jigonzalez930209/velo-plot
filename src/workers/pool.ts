/**
 * Generic worker pool with round-robin dispatch and sync fallback.
 * @module workers/pool
 */

export interface WorkerPoolOptions {
  /** Number of workers (default: 2) */
  poolSize?: number;
  /** Run tasks on main thread when Worker is unavailable */
  syncFallback?: boolean;
}

export class WorkerPool<TMessage extends { id: string }, TResult = unknown> {
  private workers: Worker[] = [];
  private pending = new Map<
    string,
    {
      resolve: (value: TResult) => void;
      reject: (error: Error) => void;
      task: TMessage;
    }
  >();
  private nextWorker = 0;
  private readonly poolSize: number;
  private readonly syncFallback: boolean;
  private readonly workerFactory: () => Worker;
  private readonly syncHandler?: (task: TMessage) => TResult | Promise<TResult>;
  private destroyed = false;

  constructor(
    workerFactory: () => Worker,
    options: WorkerPoolOptions & {
      syncHandler?: (task: TMessage) => TResult | Promise<TResult>;
    } = {},
  ) {
    this.workerFactory = workerFactory;
    this.poolSize = options.poolSize ?? 2;
    this.syncFallback = options.syncFallback ?? true;
    this.syncHandler = options.syncHandler;

    if (typeof Worker !== "undefined") {
      for (let i = 0; i < this.poolSize; i++) {
        this.spawnWorker();
      }
    }
  }

  private removeWorker(worker: Worker): void {
    const index = this.workers.indexOf(worker);
    if (index >= 0) this.workers.splice(index, 1);
    worker.terminate();
  }

  private workerErrorMessage(event: Event): string {
    const maybe = event as { message?: string };
    if (typeof maybe.message === "string" && maybe.message) return maybe.message;
    return "Worker error";
  }

  private rejectPendingWithSyncFallback(failedWorker: Worker, event: Event): void {
    this.removeWorker(failedWorker);
    const message = this.workerErrorMessage(event);
    const entries = [...this.pending.entries()];
    this.pending.clear();

    for (const [, entry] of entries) {
      if (this.syncFallback && this.syncHandler) {
        Promise.resolve(this.syncHandler(entry.task)).then(entry.resolve).catch(entry.reject);
        continue;
      }
      entry.reject(new Error(message));
    }
  }

  private spawnWorker(): void {
    const worker = this.workerFactory();
    worker.onmessage = (event: MessageEvent) => {
      const data = event.data as { id?: string; type?: string; error?: string };
      if (!data?.id) return;

      const task = this.pending.get(data.id);
      if (!task) return;

      this.pending.delete(data.id);

      if (data.type === "error" || data.error) {
        if (this.syncFallback && this.syncHandler) {
          Promise.resolve(this.syncHandler(task.task)).then(task.resolve).catch(task.reject);
          return;
        }
        task.reject(new Error(data.error ?? "Worker task failed"));
        return;
      }

      task.resolve(data as TResult);
    };

    worker.onerror = (event) => {
      this.rejectPendingWithSyncFallback(worker, event);
    };

    this.workers.push(worker);
  }

  /** Dispatch a task to the pool. Falls back to syncHandler when no workers exist. */
  run(task: TMessage): Promise<TResult> {
    if (this.destroyed) {
      return Promise.reject(new Error("WorkerPool destroyed"));
    }

    if (this.workers.length === 0) {
      if (this.syncFallback && this.syncHandler) {
        return Promise.resolve(this.syncHandler(task));
      }
      return Promise.reject(new Error("No workers available and sync fallback disabled"));
    }

    return new Promise((resolve, reject) => {
      this.pending.set(task.id, { resolve, reject, task });
      const workerIndex = this.nextWorker;
      this.nextWorker = (this.nextWorker + 1) % this.workers.length;
      this.workers[workerIndex].postMessage(task);
    });
  }

  size(): number {
    return this.workers.length;
  }

  pendingCount(): number {
    return this.pending.size;
  }

  destroy(): void {
    this.destroyed = true;
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.pending.clear();
  }
}

let taskCounter = 0;

/** Generate a unique task id */
export function nextTaskId(prefix = "task"): string {
  taskCounter += 1;
  return `${prefix}-${taskCounter}-${Date.now()}`;
}
