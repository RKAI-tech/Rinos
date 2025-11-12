import { useCallback, useEffect, useRef } from 'react';
import { authService } from '../services/auth';
import { apiRouter } from '../services/baseAPIRequest';
import { config } from '../../env.config';

type SessionHeartbeatOptions = {
  isActive: boolean;
  intervalMs?: number;
  retryDelayMs?: number;
  pauseWhenHidden?: boolean;
  getToken: () => Promise<string | null>;
  setToken: (token: string) => Promise<void>;
  clearToken: () => Promise<void>;
  onExpired: () => Promise<void> | void;
};

export function useSessionHeartbeat({
  isActive,
  intervalMs = config.SESSION_HEARTBEAT_INTERVAL ?? 5 * 60_000,
  retryDelayMs = config.SESSION_HEARTBEAT_RETRY ?? 30_000,
  pauseWhenHidden = true,
  getToken,
  setToken,
  clearToken,
  onExpired,
}: SessionHeartbeatOptions) {
  const timerRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleNext = useCallback(
    (delayMs: number) => {
      stopTimer();
      timerRef.current = window.setTimeout(() => {
        void runHeartbeat();
      }, delayMs);
    },
    [stopTimer]
  );

  const runHeartbeat = useCallback(async () => {
    if (runningRef.current) {
      return;
    }
    runningRef.current = true;
    try {
      if (pauseWhenHidden && document.hidden) {
        scheduleNext(intervalMs);
        return;
      }

      const currentToken = await getToken();
      if (!currentToken) {
        await clearToken();
        await onExpired();
        return;
      }

      const validateResponse = await authService.validateToken(currentToken);
      if (validateResponse.success && validateResponse.data?.access_token) {
        const nextToken = validateResponse.data.access_token;
        if (nextToken !== currentToken) {
          await setToken(nextToken);
          apiRouter.setAuthToken(nextToken);
        } else {
          apiRouter.setAuthToken(currentToken);
        }
        scheduleNext(intervalMs);
        return;
      }

      console.warn('[SessionHeartbeat] Token validation failed, expiring session.');
      await clearToken();
      apiRouter.clearAuth();
      await onExpired();
    } catch (error) {
      console.error('[SessionHeartbeat] Heartbeat error, scheduling retry.', error);
      scheduleNext(retryDelayMs);
    } finally {
      runningRef.current = false;
    }
  }, [
    pauseWhenHidden,
    intervalMs,
    retryDelayMs,
    getToken,
    setToken,
    clearToken,
    onExpired,
    scheduleNext,
  ]);

  useEffect(() => {
    if (isActive) {
      void runHeartbeat();
    } else {
      stopTimer();
    }
    return stopTimer;
  }, [isActive, runHeartbeat, stopTimer]);

  useEffect(() => {
    if (!pauseWhenHidden) {
      return;
    }

    const handleVisibilityChange = () => {
      if (!isActive) {
        return;
      }
      if (document.hidden) {
        stopTimer();
      } else {
        void runHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, pauseWhenHidden, runHeartbeat, stopTimer]);
}


