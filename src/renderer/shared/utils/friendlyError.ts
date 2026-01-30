const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

const normalizeErrorMessage = (error: unknown): string => {
  if (error instanceof Error && isNonEmptyString(error.message)) {
    return error.message.trim();
  }
  if (isNonEmptyString(error)) {
    return error.trim();
  }
  if (error && typeof error === 'object') {
    const message = (error as { message?: unknown }).message;
    if (isNonEmptyString(message)) {
      return message.trim();
    }
  }
  return '';
};

export const getFriendlyErrorMessage = (error: unknown, fallback: string): string => {
  const raw = normalizeErrorMessage(error);
  if (!raw) return fallback;

  const lower = raw.toLowerCase();

  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('unable to connect to server') ||
    lower.includes('network request failed')
  ) {
    return 'Unable to connect to the server. Please try again later.';
  }

  if (lower.includes('invalid json response')) {
    return 'The server returned an invalid response. Please try again.';
  }

  if (lower.includes('timeout') || lower.includes('timed out')) {
    return 'The request timed out. Please try again.';
  }

  if (lower.includes('unauthorized') || lower.includes('forbidden')) {
    return 'Your session has expired. Please sign in again.';
  }

  if (
    lower.includes('internal server error') ||
    lower.includes('service unavailable') ||
    /http\s5\d\d/.test(lower)
  ) {
    return 'The server is currently unavailable. Please try again later.';
  }

  return fallback;
};

export const logErrorAndGetFriendlyMessage = (
  label: string,
  error: unknown,
  fallback: string
): string => {
  // Always keep raw error for debugging.
  console.error(label, error);
  return getFriendlyErrorMessage(error, fallback);
};
