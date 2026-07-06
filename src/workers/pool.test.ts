import { describe, it, expect, afterEach } from "vitest";
import { WorkerPool, nextTaskId } from "./pool";

describe("WorkerPool", () => {
  afterEach(() => {
    // no global pool here
  });

  it("uses sync fallback when Worker is unavailable", async () => {
    const originalWorker = globalThis.Worker;
    // @ts-expect-error test override
    globalThis.Worker = undefined;

    const pool = new WorkerPool<{ value: number; id: string; type: string }, { doubled: number }>(
      () => new Worker(""),
      {
        syncFallback: true,
        syncHandler: (task) => ({ doubled: task.value * 2 }),
      },
    );

    const result = await pool.run({
      id: nextTaskId("sync"),
      type: "double",
      value: 21,
    });

    expect(result.doubled).toBe(42);
    expect(pool.size()).toBe(0);

    globalThis.Worker = originalWorker;
  });

  it("generates unique task ids", () => {
    const a = nextTaskId("test");
    const b = nextTaskId("test");
    expect(a).not.toBe(b);
  });

  it("rejects when destroyed", async () => {
    const pool = new WorkerPool<{ id: string; value: number }, number>(
      () => new Worker(""),
      {
        syncFallback: true,
        syncHandler: (t) => t.value,
      },
    );
    pool.destroy();
    await expect(pool.run({ id: "x", value: 1 })).rejects.toThrow("destroyed");
  });

  it("rejects when no workers and sync fallback disabled", async () => {
    const originalWorker = globalThis.Worker;
    // @ts-expect-error test override
    globalThis.Worker = undefined;

    const pool = new WorkerPool<{ id: string }, unknown>(() => new Worker(""), {
      syncFallback: false,
    });

    await expect(pool.run({ id: "x" })).rejects.toThrow("No workers available");

    globalThis.Worker = originalWorker;
  });

  it("falls back to sync when worker emits onerror", async () => {
    class FailingWorker {
      onmessage: ((ev: MessageEvent) => void) | null = null;
      onerror: ((ev: Event) => void) | null = null;
      postMessage(_task: { id: string; value: number }) {
        queueMicrotask(() => {
          this.onerror?.({ type: "error" } as Event);
        });
      }
      terminate() {}
    }

    const originalWorker = globalThis.Worker;
    // @ts-expect-error mock constructor
    globalThis.Worker = FailingWorker;

    type Task = { id: string; value: number };
    type Result = { doubled: number };
    const pool = new WorkerPool<Task, Result>(() => new FailingWorker() as unknown as Worker, {
      poolSize: 1,
      syncFallback: true,
      syncHandler: (task) => ({ doubled: task.value * 3 }),
    });

    const result = await pool.run({ id: "w1", value: 7 });
    expect(result.doubled).toBe(21);
    expect(pool.size()).toBe(0);
    pool.destroy();

    globalThis.Worker = originalWorker;
  });

  it("dispatches through worker postMessage when Worker exists", async () => {
    class MockWorker {
      onmessage: ((ev: MessageEvent) => void) | null = null;
      onerror: ((ev: ErrorEvent) => void) | null = null;
      postMessage(task: { id: string; value: number }) {
        queueMicrotask(() => {
          this.onmessage?.({
            data: { id: task.id, type: "ok", doubled: task.value * 2 },
          } as MessageEvent);
        });
      }
      terminate() {}
    }

    const originalWorker = globalThis.Worker;
    // @ts-expect-error mock constructor
    globalThis.Worker = MockWorker;

    type Task = { id: string; value: number };
    type Result = { id: string; type: string; doubled: number };
    const pool = new WorkerPool<Task, Result>(() => new MockWorker() as unknown as Worker, {
      poolSize: 1,
      syncFallback: false,
    });

    const result = await pool.run({ id: "w1", value: 11 });
    expect(result.doubled).toBe(22);
    expect(pool.pendingCount()).toBe(0);
    pool.destroy();

    globalThis.Worker = originalWorker;
  });
});
