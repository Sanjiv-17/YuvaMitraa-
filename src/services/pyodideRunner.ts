export type PyodideLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface PythonTestCaseInput {
  label: string;
  args: any[];
  expected: any;
}

export interface PythonTestCaseResult {
  index: number;
  label: string;
  passed: boolean;
  expected: string;
  actual: string;
  typeHint?: string;
  error?: string;
  traceback?: string;
}

export interface PythonExecutionResult {
  ok: boolean;
  timedOut?: boolean;
  errorType: string;
  errorMessage: string;
  traceback: string;
  stdout: string;
  stderr: string;
  results: PythonTestCaseResult[];
  elapsedMs?: number;
}

type StatusListener = (status: PyodideLoadStatus) => void;

let workerInstance: Worker | null = null;
let currentStatus: PyodideLoadStatus = 'idle';
let inflightInitPromise: Promise<void> | null = null;
let requestCounter = 0;

const statusListeners = new Set<StatusListener>();

function setStatus(next: PyodideLoadStatus) {
  currentStatus = next;
  statusListeners.forEach((listener) => {
    try {
      listener(next);
    } catch {
      // ignore listener errors
    }
  });
}

export function getPyodideStatus(): PyodideLoadStatus {
  return currentStatus;
}

export function subscribePyodideStatus(listener: StatusListener): () => void {
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
}

function resetWorker() {
  if (workerInstance) {
    try {
      workerInstance.terminate();
    } catch {
      // ignore termination error
    }
    workerInstance = null;
  }
  inflightInitPromise = null;
  setStatus('idle');
}

function getOrCreateWorker(): Worker {
  if (!workerInstance) {
    workerInstance = new Worker('/pyodide-worker.js');
  }
  return workerInstance;
}

/**
 * Lazy-loads Pyodide inside the dedicated Web Worker from the official CDN
 * and caches the initialized runtime for subsequent runs.
 */
export function preloadPyodideRuntime(): Promise<void> {
  if (currentStatus === 'ready' && workerInstance) {
    return Promise.resolve();
  }
  if (inflightInitPromise) {
    return inflightInitPromise;
  }

  setStatus('loading');
  const worker = getOrCreateWorker();
  const reqId = `init-${++requestCounter}`;

  inflightInitPromise = new Promise<void>((resolve, reject) => {
    const loadTimeout = setTimeout(() => {
      cleanup();
      resetWorker();
      setStatus('error');
      reject(new Error('Loading Python runtime timed out. Please check your network connection and try again.'));
    }, 30000);

    const onMessage = (event: MessageEvent) => {
      const msg = event.data || {};
      if (msg.type === 'status') {
        if (msg.status === 'loading') setStatus('loading');
        else if (msg.status === 'ready') setStatus('ready');
      }
      if (msg.id !== reqId) return;

      if (msg.type === 'init_done') {
        cleanup();
        setStatus('ready');
        inflightInitPromise = null;
        resolve();
      } else if (msg.type === 'init_error') {
        cleanup();
        resetWorker();
        setStatus('error');
        reject(new Error(msg.error || 'Failed to load Python runtime from CDN.'));
      }
    };

    const onError = (err: ErrorEvent) => {
      cleanup();
      resetWorker();
      setStatus('error');
      reject(new Error(err?.message || 'Python worker initialization error.'));
    };

    const cleanup = () => {
      clearTimeout(loadTimeout);
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
    };

    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
    worker.postMessage({ type: 'init', id: reqId });
  });

  return inflightInitPromise;
}

/**
 * Executes Python user code and unit test cases in the Web Worker
 * with a strict 5-second timeout to guard against infinite loops.
 */
export async function runPythonTestsInWorker(params: {
  code: string;
  fnName: string;
  testCases: PythonTestCaseInput[];
  timeoutMs?: number;
}): Promise<PythonExecutionResult> {
  const timeoutMs = params.timeoutMs ?? 5000;

  try {
    await preloadPyodideRuntime();
  } catch (loadErr: any) {
    return {
      ok: false,
      errorType: 'RuntimeLoadError',
      errorMessage: loadErr?.message || 'Failed to load Python runtime (Pyodide).',
      traceback: '',
      stdout: '',
      stderr: '',
      results: [],
    };
  }

  const worker = getOrCreateWorker();
  const reqId = `run-${++requestCounter}`;

  return await new Promise<PythonExecutionResult>((resolve) => {
    const timer = setTimeout(() => {
      cleanup();
      // Terminate frozen worker immediately so infinite loops never freeze the UI
      resetWorker();
      resolve({
        ok: false,
        timedOut: true,
        errorType: 'TimeoutError',
        errorMessage: `Execution timed out after ${Math.round(timeoutMs / 1000)} seconds (possible infinite loop).`,
        traceback: '',
        stdout: '',
        stderr: '',
        results: [],
        elapsedMs: timeoutMs,
      });
    }, timeoutMs);

    const onMessage = (event: MessageEvent) => {
      const msg = event.data || {};
      if (msg.id !== reqId) return;

      if (msg.type === 'run_done') {
        cleanup();
        resolve(msg.payload as PythonExecutionResult);
      } else if (msg.type === 'run_error') {
        cleanup();
        resolve({
          ok: false,
          errorType: 'ExecutionError',
          errorMessage: msg.error || 'Unexpected error while running Python code.',
          traceback: '',
          stdout: '',
          stderr: '',
          results: [],
        });
      }
    };

    const onError = (err: ErrorEvent) => {
      cleanup();
      resetWorker();
      resolve({
        ok: false,
        errorType: 'WorkerError',
        errorMessage: err?.message || 'Python worker crashed during execution.',
        traceback: '',
        stdout: '',
        stderr: '',
        results: [],
      });
    };

    const cleanup = () => {
      clearTimeout(timer);
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
    };

    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
    worker.postMessage({
      type: 'run',
      id: reqId,
      code: params.code,
      fnName: params.fnName,
      testCases: params.testCases,
    });
  });
}
