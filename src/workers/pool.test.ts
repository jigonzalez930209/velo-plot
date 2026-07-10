import { describe, it, expect, afterEach, vi } from "vitest";
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

  it("defaults syncFallback to true when the option is omitted", async () => {
    const originalWorker = globalThis.Worker;
    // @ts-expect-error test override
    globalThis.Worker = undefined;

    const pool = new WorkerPool<{ id: string; value: number }, number>(
      () => new Worker(""),
      { syncHandler: (t) => t.value * 10 }, // no syncFallback → default true
    );
    await expect(pool.run({ id: "d1", value: 4 })).resolves.toBe(40);

    globalThis.Worker = originalWorker;
  });

  it("rejects pending tasks on worker error when sync fallback is disabled", async () => {
    class FailingWorker {
      onmessage: ((ev: MessageEvent) => void) | null = null;
      onerror: ((ev: Event) => void) | null = null;
      postMessage(_task: { id: string }) {
        queueMicrotask(() => {
          this.onerror?.({ type: "error", message: "boom" } as unknown as Event);
        });
      }
      terminate() {}
    }
    const originalWorker = globalThis.Worker;
    // @ts-expect-error mock constructor
    globalThis.Worker = FailingWorker;

    const pool = new WorkerPool<{ id: string }, unknown>(
      () => new FailingWorker() as unknown as Worker,
      { poolSize: 1, syncFallback: false },
    );
    await expect(pool.run({ id: "e1" })).rejects.toThrow("boom");
    pool.destroy();
    globalThis.Worker = originalWorker;
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

  it("rejects when worker posts error result without sync fallback", async () => {
    class ErrorWorker {
      onmessage: ((ev: MessageEvent) => void) | null = null;
      onerror: ((ev: Event) => void) | null = null;
      postMessage(task: { id: string }) {
        queueMicrotask(() => {
          this.onmessage?.({
            data: { id: task.id, type: "error", error: "task failed" },
          } as MessageEvent);
        });
      }
      terminate() {}
    }

    const originalWorker = globalThis.Worker;
    // @ts-expect-error mock
    globalThis.Worker = ErrorWorker;

    const pool = new WorkerPool<{ id: string; value: number }, { ok: boolean }>(
      () => new ErrorWorker() as unknown as Worker,
      { poolSize: 1, syncFallback: false },
    );

    await expect(pool.run({ id: "e1", value: 1 })).rejects.toThrow("task failed");
    pool.destroy();
    globalThis.Worker = originalWorker;
  });

  it("falls back to sync when worker posts error result", async () => {
    class ErrorWorker {
      onmessage: ((ev: MessageEvent) => void) | null = null;
      onerror: ((ev: Event) => void) | null = null;
      postMessage(task: { id: string; value: number }) {
        queueMicrotask(() => {
          this.onmessage?.({
            data: { id: task.id, type: "error", error: "task failed" },
          } as MessageEvent);
        });
      }
      terminate() {}
    }

    const originalWorker = globalThis.Worker;
    // @ts-expect-error mock
    globalThis.Worker = ErrorWorker;

    const pool = new WorkerPool<{ id: string; value: number }, { doubled: number }>(
      () => new ErrorWorker() as unknown as Worker,
      {
        poolSize: 1,
        syncFallback: true,
        syncHandler: (task) => ({ doubled: task.value * 4 }),
      },
    );

    const result = await pool.run({ id: "e2", value: 5 });
    expect(result.doubled).toBe(20);
    pool.destroy();
    globalThis.Worker = originalWorker;
  });

  it("falls back to sync when postMessage throws", async () => {
    class ThrowingPostWorker {
      onmessage: ((ev: MessageEvent) => void) | null = null;
      onerror: ((ev: Event) => void) | null = null;
      postMessage(_task: { id: string; value: number }) {
        throw new Error("post failed");
      }
      terminate() {}
    }

    const originalWorker = globalThis.Worker;
    // @ts-expect-error mock
    globalThis.Worker = ThrowingPostWorker;

    const pool = new WorkerPool<{ id: string; value: number }, { v: number }>(
      () => new ThrowingPostWorker() as unknown as Worker,
      {
        poolSize: 1,
        syncFallback: true,
        syncHandler: (t) => ({ v: t.value + 1 }),
      },
    );

    const result = await pool.run({ id: "post-fail", value: 4 });
    expect(result.v).toBe(5);
    pool.destroy();
    globalThis.Worker = originalWorker;
  });

  it("rejects on timeout when sync fallback is disabled", async () => {
    class SilentWorker {
      onmessage: ((ev: MessageEvent) => void) | null = null;
      onerror: ((ev: Event) => void) | null = null;
      postMessage(_task: { id: string }) {}
      terminate() {}
    }

    const originalWorker = globalThis.Worker;
    // @ts-expect-error mock
    globalThis.Worker = SilentWorker;

    const pool = new WorkerPool<{ id: string }, unknown>(
      () => new SilentWorker() as unknown as Worker,
      { poolSize: 1, syncFallback: false, timeoutMs: 20 },
    );

    await expect(pool.run({ id: "silent-no-sync" })).rejects.toThrow("timed out");
    pool.destroy();
    globalThis.Worker = originalWorker;
  });

  it("ignores worker messages without task id", async () => {
    class NoIdWorker {
      onmessage: ((ev: MessageEvent) => void) | null = null;
      onerror: ((ev: Event) => void) | null = null;
      postMessage(_task: { id: string }) {
        queueMicrotask(() => {
          this.onmessage?.({ data: { type: "ok" } } as MessageEvent);
        });
      }
      terminate() {}
    }

    const originalWorker = globalThis.Worker;
    // @ts-expect-error mock
    globalThis.Worker = NoIdWorker;

    const pool = new WorkerPool<{ id: string; value: number }, number>(
      () => new NoIdWorker() as unknown as Worker,
      {
        poolSize: 1,
        syncFallback: true,
        syncHandler: (t) => t.value,
      },
    );

    const pending = pool.run({ id: "x1", value: 9 });
    await expect(Promise.race([pending, new Promise((r) => setTimeout(() => r("timeout"), 50))])).resolves.toBe(
      "timeout",
    );
    pool.destroy();
    globalThis.Worker = originalWorker;
  });

  it("ignores worker messages for unknown pending task ids", async () => {
    class UnknownIdWorker {
      onmessage: ((ev: MessageEvent) => void) | null = null;
      onerror: ((ev: Event) => void) | null = null;
      postMessage(_task: { id: string }) {
        queueMicrotask(() => {
          this.onmessage?.({ data: { id: "orphan", type: "ok" } } as MessageEvent);
        });
      }
      terminate() {}
    }

    const originalWorker = globalThis.Worker;
    // @ts-expect-error mock
    globalThis.Worker = UnknownIdWorker;

    const pool = new WorkerPool<{ id: string; value: number }, number>(
      () => new UnknownIdWorker() as unknown as Worker,
      {
        poolSize: 1,
        syncFallback: true,
        syncHandler: (t) => t.value,
      },
    );

    const pending = pool.run({ id: "x1", value: 9 });
    await expect(Promise.race([pending, new Promise((r) => setTimeout(() => r("timeout"), 50))])).resolves.toBe(
      "timeout",
    );
    pool.destroy();
    globalThis.Worker = originalWorker;
  });

  it("rejects worker error results without sync fallback", async () => {
    class GenericErrorWorker {
      onmessage: ((ev: MessageEvent) => void) | null = null;
      onerror: ((ev: Event) => void) | null = null;
      postMessage(task: { id: string }) {
        queueMicrotask(() => {
          this.onmessage?.({ data: { id: task.id, type: "error" } } as MessageEvent);
        });
      }
      terminate() {}
    }

    const originalWorker = globalThis.Worker;
    // @ts-expect-error mock
    globalThis.Worker = GenericErrorWorker;

    const pool = new WorkerPool<{ id: string }, unknown>(
      () => new GenericErrorWorker() as unknown as Worker,
      { poolSize: 1, syncFallback: false },
    );

    await expect(pool.run({ id: "err-generic" })).rejects.toThrow("Worker task failed");
    pool.destroy();
    globalThis.Worker = originalWorker;
  });

  it("rejects when postMessage throws without sync fallback", async () => {
    class ThrowingPostWorker {
      onmessage: ((ev: MessageEvent) => void) | null = null;
      onerror: ((ev: Event) => void) | null = null;
      postMessage(_task: { id: string }) {
        throw new Error("post failed");
      }
      terminate() {}
    }

    const originalWorker = globalThis.Worker;
    // @ts-expect-error mock
    globalThis.Worker = ThrowingPostWorker;

    const pool = new WorkerPool<{ id: string; value: number }, number>(
      () => new ThrowingPostWorker() as unknown as Worker,
      { poolSize: 1, syncFallback: false },
    );

    await expect(pool.run({ id: "post-fail-hard", value: 1 })).rejects.toThrow("post failed");
    pool.destroy();
    globalThis.Worker = originalWorker;
  });

  it("ignores timeout callbacks after the task already settled", async () => {
    vi.useFakeTimers();
    class FastWorker {
      onmessage: ((ev: MessageEvent) => void) | null = null;
      onerror: ((ev: Event) => void) | null = null;
      postMessage(task: { id: string; value: number }) {
        queueMicrotask(() => {
          this.onmessage?.({ data: { id: task.id, ok: task.value } } as MessageEvent);
        });
      }
      terminate() {}
    }

    const originalWorker = globalThis.Worker;
    // @ts-expect-error mock
    globalThis.Worker = FastWorker;

    const pool = new WorkerPool<{ id: string; value: number }, { ok: number }>(
      () => new FastWorker() as unknown as Worker,
      { poolSize: 1, syncFallback: false, timeoutMs: 500 },
    );

    await pool.run({ id: "fast", value: 9 });
    expect(pool.pendingCount()).toBe(0);
    vi.advanceTimersByTime(500);
    pool.destroy();
    globalThis.Worker = originalWorker;
    vi.useRealTimers();
  });

  it("wraps non-error postMessage throws when sync fallback is disabled", async () => {
    class ThrowingPostWorker {
      onmessage: ((ev: MessageEvent) => void) | null = null;
      onerror: ((ev: Event) => void) | null = null;
      postMessage(_task: { id: string }) {
        throw "post failed";
      }
      terminate() {}
    }

    const originalWorker = globalThis.Worker;
    // @ts-expect-error mock
    globalThis.Worker = ThrowingPostWorker;

    const pool = new WorkerPool<{ id: string; value: number }, number>(
      () => new ThrowingPostWorker() as unknown as Worker,
      { poolSize: 1, syncFallback: false },
    );

    await expect(pool.run({ id: "post-fail-string", value: 1 })).rejects.toThrow("post failed");
    pool.destroy();
    globalThis.Worker = originalWorker;
  });

  it("falls back to sync when the worker stays silent past timeoutMs", async () => {
    class SilentWorker {
      onmessage: ((ev: MessageEvent) => void) | null = null;
      onerror: ((ev: Event) => void) | null = null;
      postMessage(_task: { id: string }) {
        // Never responds — simulates broken Vite worker URL in docs.
      }
      terminate() {}
    }

    const originalWorker = globalThis.Worker;
    // @ts-expect-error mock
    globalThis.Worker = SilentWorker;

    const pool = new WorkerPool<{ id: string; value: number }, { v: number }>(
      () => new SilentWorker() as unknown as Worker,
      {
        poolSize: 1,
        syncFallback: true,
        timeoutMs: 30,
        syncHandler: (t) => ({ v: t.value * 5 }),
      },
    );

    const result = await pool.run({ id: "silent-1", value: 3 });
    expect(result.v).toBe(15);
    pool.destroy();
    globalThis.Worker = originalWorker;
  });
});
