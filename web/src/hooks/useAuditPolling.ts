import { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '../api/client';
import type { AuditResult } from '../api/schema';

interface UseAuditPollingOptions {
  auditId: string | null;
  enabled?: boolean;
  onComplete?: (result: AuditResult) => void;
  onError?: (error: string) => void;
  intervalMs?: number;
}

export function useAuditPolling({
  auditId,
  enabled = true,
  onComplete,
  onError,
  intervalMs = 1200,
}: UseAuditPollingOptions) {
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [currentStage, setCurrentStage] = useState<string>('Uploading');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Preserve latest callbacks in refs to avoid restarting polling on re-renders
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!auditId || !enabled) {
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const checkAudit = async () => {
      if (!isMounted) return;

      try {
        const result = await apiClient.getAudit(auditId);
        if (!isMounted) return;

        setAudit(result);
        if (result.stage) {
          setCurrentStage(result.stage);
        }

        if (result.status === 'complete') {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setLoading(false);
          if (onCompleteRef.current) {
            onCompleteRef.current(result);
          }
        } else if (result.status === 'failed') {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setLoading(false);
          const err = result.error || 'Audit analysis failed to complete.';
          setError(err);
          if (onErrorRef.current) {
            onErrorRef.current(err);
          }
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : 'Error communicating with analysis service.';
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setError(message);
        setLoading(false);
        if (onErrorRef.current) {
          onErrorRef.current(message);
        }
      }
    };

    // Immediate initial poll
    checkAudit();

    // Subsequent periodic polls every intervalMs
    timerRef.current = setInterval(checkAudit, intervalMs);

    return () => {
      isMounted = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [auditId, enabled, intervalMs]);

  return {
    audit,
    currentStage,
    loading,
    error,
    stopPolling,
  };
}
