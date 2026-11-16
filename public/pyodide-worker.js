/* eslint-disable no-restricted-globals */
// Dedicated Web Worker for sandboxed in-browser Python execution via Pyodide.
// Loaded lazily only when the user selects Python or runs Python test cases.

const PYODIDE_INDEX_URL = 'https://cdn.jsdelivr.net/pyodide/v0.27.5/full/';
const PYODIDE_SCRIPT_URL = `${PYODIDE_INDEX_URL}pyodide.js`;

let pyodideInstance = null;
let pyodideLoadPromise = null;

async function ensurePyodide() {
  if (pyodideInstance) {
    return pyodideInstance;
  }
  if (!pyodideLoadPromise) {
    pyodideLoadPromise = (async () => {
      self.postMessage({ type: 'status', status: 'loading' });
      importScripts(PYODIDE_SCRIPT_URL);
      if (typeof self.loadPyodide !== 'function') {
        throw new Error('Failed to load Pyodide runtime from official CDN.');
      }
      const instance = await self.loadPyodide({
        indexURL: PYODIDE_INDEX_URL,
      });
      pyodideInstance = instance;
      self.postMessage({ type: 'status', status: 'ready' });
      return instance;
    })().catch((err) => {
      pyodideLoadPromise = null;
      self.postMessage({ type: 'status', status: 'error', error: err?.message || String(err) });
      throw err;
    });
  }
  return pyodideLoadPromise;
}

const PYTHON_TEST_HARNESS = `
import io
import json
import copy
import traceback
import contextlib

def _format_value(val):
    if val is None:
        return "None"
    if isinstance(val, bool):
        return "True" if val else "False"
    if isinstance(val, (int, float, str, list, dict)):
        try:
            return json.dumps(val)
        except Exception:
            return repr(val)
    return repr(val)

def _format_expected(val):
    if isinstance(val, bool):
        return "True" if val else "False"
    try:
        return json.dumps(val)
    except Exception:
        return repr(val)

def _strict_equals(actual, expected):
    if isinstance(expected, bool):
        return isinstance(actual, bool) and actual == expected
    if isinstance(expected, int):
        return isinstance(actual, int) and not isinstance(actual, bool) and actual == expected
    if isinstance(expected, float):
        return isinstance(actual, (int, float)) and not isinstance(actual, bool) and actual == expected
    if isinstance(expected, str):
        return isinstance(actual, str) and actual == expected
    if isinstance(expected, list):
        if not isinstance(actual, list) or len(actual) != len(expected):
            return False
        return all(_strict_equals(a, e) for a, e in zip(actual, expected))
    if isinstance(expected, dict):
        if not isinstance(actual, dict) or set(actual.keys()) != set(expected.keys()):
            return False
        return all(_strict_equals(actual[k], expected[k]) for k in expected)
    return type(actual) is type(expected) and actual == expected

def _type_mismatch_hint(actual, expected):
    if actual is None and expected is not None:
        return "wrong return type: expected " + type(expected).__name__ + ", got NoneType (missing return statement?)"
    if isinstance(expected, bool) and not isinstance(actual, bool):
        return "wrong return type: expected bool, got " + type(actual).__name__
    if isinstance(expected, int) and not isinstance(expected, bool) and (isinstance(actual, bool) or not isinstance(actual, int)):
        return "wrong return type: expected int, got " + type(actual).__name__
    if isinstance(expected, list) and not isinstance(actual, list):
        return "wrong return type: expected list, got " + type(actual).__name__
    if isinstance(expected, str) and not isinstance(actual, str):
        return "wrong return type: expected str, got " + type(actual).__name__
    return ""

def _run_yuvamitraa_tests(user_code, fn_name, test_cases_json):
    stdout_buf = io.StringIO()
    stderr_buf = io.StringIO()
    ns = {"__name__": "__main__"}
    test_cases = json.loads(test_cases_json)

    # 1. Compile and execute user code in isolated namespace
    try:
        compiled = compile(user_code, "solution.py", "exec")
        with contextlib.redirect_stdout(stdout_buf), contextlib.redirect_stderr(stderr_buf):
            exec(compiled, ns)
    except SyntaxError as syn_err:
        tb = traceback.format_exc()
        return json.dumps({
            "ok": False,
            "errorType": "SyntaxError",
            "errorMessage": f"SyntaxError on line {syn_err.lineno}: {syn_err.msg}",
            "traceback": tb,
            "stdout": stdout_buf.getvalue()[:4000],
            "stderr": stderr_buf.getvalue()[:4000],
            "results": []
        })
    except Exception as exec_err:
        tb = traceback.format_exc()
        return json.dumps({
            "ok": False,
            "errorType": type(exec_err).__name__,
            "errorMessage": f"{type(exec_err).__name__}: {exec_err}",
            "traceback": tb,
            "stdout": stdout_buf.getvalue()[:4000],
            "stderr": stderr_buf.getvalue()[:4000],
            "results": []
        })

    # 2. Verify expected entry function exists and is callable
    if fn_name not in ns:
        return json.dumps({
            "ok": False,
            "errorType": "MissingFunctionError",
            "errorMessage": f"Missing function '{fn_name}'. Please keep or define 'def {fn_name}(...):' in your solution.",
            "traceback": "",
            "stdout": stdout_buf.getvalue()[:4000],
            "stderr": stderr_buf.getvalue()[:4000],
            "results": []
        })

    user_fn = ns[fn_name]
    if not callable(user_fn):
        return json.dumps({
            "ok": False,
            "errorType": "TypeError",
            "errorMessage": f"'{fn_name}' is defined as {type(user_fn).__name__}, not a callable function.",
            "traceback": "",
            "stdout": stdout_buf.getvalue()[:4000],
            "stderr": stderr_buf.getvalue()[:4000],
            "results": []
        })

    # 3. Execute all test cases against user's function
    results = []
    all_passed = True

    for idx, tc in enumerate(test_cases):
        args = copy.deepcopy(tc.get("args", []))
        expected = tc.get("expected")
        label = tc.get("label", "")
        expected_str = _format_expected(expected)
        try:
            with contextlib.redirect_stdout(stdout_buf), contextlib.redirect_stderr(stderr_buf):
                actual = user_fn(*args)
            passed = _strict_equals(actual, expected)
            actual_str = _format_value(actual)
            type_hint = "" if passed else _type_mismatch_hint(actual, expected)
            if not passed:
                all_passed = False
            results.append({
                "index": idx + 1,
                "label": label,
                "passed": bool(passed),
                "expected": expected_str,
                "actual": actual_str,
                "typeHint": type_hint,
                "error": ""
            })
        except Exception as case_err:
            all_passed = False
            tb = traceback.format_exc()
            results.append({
                "index": idx + 1,
                "label": label,
                "passed": False,
                "expected": expected_str,
                "actual": "",
                "typeHint": "",
                "error": f"{type(case_err).__name__}: {case_err}",
                "traceback": tb
            })

    return json.dumps({
        "ok": all_passed,
        "errorType": "",
        "errorMessage": "",
        "traceback": "",
        "stdout": stdout_buf.getvalue()[:4000],
        "stderr": stderr_buf.getvalue()[:4000],
        "results": results
    })
`;

let harnessInstalled = false;

self.onmessage = async (event) => {
  const data = event.data || {};
  const { type, id } = data;

  if (type === 'init') {
    try {
      await ensurePyodide();
      self.postMessage({ type: 'init_done', id });
    } catch (err) {
      self.postMessage({
        type: 'init_error',
        id,
        error: err?.message || 'Unable to load Python runtime.',
      });
    }
    return;
  }

  if (type === 'run') {
    try {
      const pyodide = await ensurePyodide();
      if (!harnessInstalled) {
        pyodide.runPython(PYTHON_TEST_HARNESS);
        harnessInstalled = true;
      }

      const start = performance.now();
      pyodide.globals.set('__ym_user_code', String(data.code || ''));
      pyodide.globals.set('__ym_fn_name', String(data.fnName || ''));
      pyodide.globals.set('__ym_test_cases_json', JSON.stringify(data.testCases || []));

      let rawJson;
      try {
        rawJson = pyodide.runPython(
          '_run_yuvamitraa_tests(__ym_user_code, __ym_fn_name, __ym_test_cases_json)'
        );
      } finally {
        try {
          pyodide.globals.delete('__ym_user_code');
          pyodide.globals.delete('__ym_fn_name');
          pyodide.globals.delete('__ym_test_cases_json');
        } catch {
          // ignore cleanup errors
        }
      }

      const elapsedMs = performance.now() - start;
      const payload = JSON.parse(String(rawJson || '{}'));
      payload.elapsedMs = elapsedMs;

      self.postMessage({
        type: 'run_done',
        id,
        payload,
      });
    } catch (err) {
      self.postMessage({
        type: 'run_error',
        id,
        error: err?.message || String(err),
      });
    }
  }
};
