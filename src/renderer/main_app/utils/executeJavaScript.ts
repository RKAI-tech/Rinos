/**
 * Execute JavaScript code and capture output
 * @param code - JavaScript code to execute
 * @returns Object containing result string and error string
 */
export interface ExecuteJavaScriptResult {
  result: string;
  error: string;
}

export function executeJavaScript(code: string): ExecuteJavaScriptResult {
  const result: ExecuteJavaScriptResult = {
    result: '',
    error: '',
  };

  try {
    // Capture console.log và console.error để hiển thị output
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const logs: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Override console methods để capture output
    console.log = (...args: any[]) => {
      logs.push(
        args
          .map((arg) =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          )
          .join(' ')
      );
      originalLog.apply(console, args);
    };

    console.error = (...args: any[]) => {
      errors.push(
        args
          .map((arg) =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          )
          .join(' ')
      );
      originalError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      warnings.push(
        args
          .map((arg) =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          )
          .join(' ')
      );
      originalWarn.apply(console, args);
    };

    // Execute JavaScript code
    const trimmedCode = code.trim();

    // Execute code và capture return value
    let returnValue: any;
    let hasReturnValue = false;

    try {
      // Thử execute như expression (có return value)
      try {
        const func = new Function('return (' + trimmedCode + ')');
        returnValue = func();
        hasReturnValue = true;

        // Nếu return value là một function, tự động gọi nó
        if (typeof returnValue === 'function') {
          returnValue = returnValue();
          hasReturnValue = true;
        }
      } catch (exprError: any) {
        // Nếu không phải expression, thử execute như statement
        const wrappedCode = `
          try {
            ${trimmedCode}
          } catch (error) {
            console.error('Execution error:', error.message);
            throw error;
          }
        `;

        const func = new Function(wrappedCode);
        func();
        hasReturnValue = false; // Statement không return gì
      }
    } catch (execError: any) {
      throw new Error(`Execution failed: ${execError.message}`);
    }

    // Restore console methods
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;

    // Build result output - chỉ hiển thị giá trị thực tế, không có label
    const resultParts: string[] = [];

    if (hasReturnValue && returnValue !== undefined) {
      const returnStr =
        typeof returnValue === 'object'
          ? JSON.stringify(returnValue, null, 2)
          : String(returnValue);
      resultParts.push(returnStr);
    }

    if (logs.length > 0) {
      resultParts.push(logs.join('\n'));
    }

    if (warnings.length > 0) {
      resultParts.push(warnings.join('\n'));
    }

    if (errors.length > 0) {
      resultParts.push(errors.join('\n'));
    }

    result.result =
      resultParts.length > 0
        ? resultParts.join('\n')
        : '';

    // Nếu có errors trong console, set error message
    if (errors.length > 0) {
      result.error = 'Function executed with errors. Check console output above.';
    }
  } catch (error: any) {
    console.error('Error testing function code:', error);
    const errorMsg = error.message || 'Failed to execute function';
    result.result = `Error: ${errorMsg}\n\nStack trace:\n${error.stack || 'N/A'}`;
    result.error = errorMsg;
  }

  return result;
}
