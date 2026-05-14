import { useState, useCallback, useRef, useEffect } from 'react';

export interface SecurityWarning {
  id: string;
  type: 'head' | 'eye' | 'sound' | 'tab';
  message: string;
  timestamp: Date;
}

export interface ExamSecurityState {
  isFullscreen: boolean;
  warnings: SecurityWarning[];
  warningCount: number;
  maxWarnings: number;
  isForceSubmitted: boolean;
  headPosition: { x: number; y: number };
  eyeDeviation: number;
  soundLevel: number;
  remainingTime: number;
  studentToken: string;
  isTimerRunning: boolean;
}

export const useExamSecurity = (maxWarnings = 3) => {
  const [state, setState] = useState<ExamSecurityState>({
    isFullscreen: false,
    warnings: [],
    warningCount: 0,
    maxWarnings,
    isForceSubmitted: false,
    headPosition: { x: 0, y: 0 },
    eyeDeviation: 0,
    soundLevel: 0,
    remainingTime: 3600,
    studentToken: `STU-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    isTimerRunning: false,
  });

  const timerRef = useRef<number | null>(null);
  const fullscreenRetryRef = useRef<number | null>(null);

  const addWarning = useCallback((type: SecurityWarning['type'], message: string) => {
    setState((prev) => {
      const newWarning: SecurityWarning = {
        id: crypto.randomUUID(),
        type,
        message,
        timestamp: new Date(),
      };
      const newWarnings = [...prev.warnings, newWarning];
      const newCount = prev.warningCount + 1;

      if (newCount >= prev.maxWarnings) {
        return {
          ...prev,
          warnings: newWarnings,
          warningCount: newCount,
          isForceSubmitted: true,
          isTimerRunning: false,
        };
      }

      return {
        ...prev,
        warnings: newWarnings,
        warningCount: newCount,
      };
    });
  }, []);

  const updateHeadPosition = useCallback((x: number, y: number) => {
    setState((prev) => ({
      ...prev,
      headPosition: { x, y },
    }));
  }, []);

  const updateEyeDeviation = useCallback((deviation: number) => {
    setState((prev) => ({
      ...prev,
      eyeDeviation: deviation,
    }));
  }, []);

  const updateSoundLevel = useCallback((level: number) => {
    setState((prev) => ({
      ...prev,
      soundLevel: level,
    }));
  }, []);

  const enterFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
      setState((prev) => ({ ...prev, isFullscreen: true }));
    } catch (error) {
      console.error('Failed to enter fullscreen:', error);
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    setState((prev) => ({ ...prev, isFullscreen: false }));
  }, []);

  const startTimer = useCallback((durationSeconds: number) => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }

    setState((prev) => ({ 
      ...prev, 
      remainingTime: durationSeconds,
      isTimerRunning: true,
    }));
    
    timerRef.current = window.setInterval(() => {
      setState((prev) => {
        if (prev.remainingTime <= 1) {
          if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return { 
            ...prev, 
            remainingTime: 0, 
            isForceSubmitted: true,
            isTimerRunning: false,
          };
        }
        return { ...prev, remainingTime: prev.remainingTime - 1 };
      });
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setState((prev) => ({ ...prev, isTimerRunning: false }));
  }, []);

  const resetSecurity = useCallback(() => {
    stopTimer();
    setState({
      isFullscreen: false,
      warnings: [],
      warningCount: 0,
      maxWarnings,
      isForceSubmitted: false,
      headPosition: { x: 0, y: 0 },
      eyeDeviation: 0,
      soundLevel: 0,
      remainingTime: 3600,
      studentToken: `STU-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      isTimerRunning: false,
    });
  }, [maxWarnings, stopTimer]);

  const setMaxWarnings = useCallback((newMax: number) => {
    setState((prev) => ({ ...prev, maxWarnings: newMax }));
  }, []);

  // STRICT fullscreen: warn on every exit AND auto re-enter immediately.
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setState((prev) => {
        if (!isFs && prev.isTimerRunning && !prev.isForceSubmitted) {
          // Issue a warning on every exit attempt
          const newWarning: SecurityWarning = {
            id: crypto.randomUUID(),
            type: 'tab',
            message: 'Fullscreen exited — re-entering. Repeated attempts will force submit.',
            timestamp: new Date(),
          };
          const newWarnings = [...prev.warnings, newWarning];
          const newCount = prev.warningCount + 1;

          if (fullscreenRetryRef.current) window.clearTimeout(fullscreenRetryRef.current);
          fullscreenRetryRef.current = window.setTimeout(async () => {
            try { await document.documentElement.requestFullscreen(); } catch { /* user-gesture lost */ }
          }, 150);

          if (newCount >= prev.maxWarnings) {
            return { ...prev, warnings: newWarnings, warningCount: newCount, isFullscreen: false, isForceSubmitted: true, isTimerRunning: false };
          }
          return { ...prev, warnings: newWarnings, warningCount: newCount, isFullscreen: false };
        }
        return { ...prev, isFullscreen: isFs };
      });
    };

    // Block Esc / F11 / Ctrl+W / Alt+Tab combos during exam
    const handleKeyDown = (e: KeyboardEvent) => {
      const blockedKeys = ['Escape', 'F11'];
      const blockedCombos = (e.ctrlKey && (e.key === 'w' || e.key === 'W' || e.key === 't' || e.key === 'T' || e.key === 'n' || e.key === 'N')) ||
                            (e.altKey && e.key === 'Tab') ||
                            (e.metaKey && e.key === 'Tab');
      if (blockedKeys.includes(e.key) || blockedCombos) {
        setState(prev => {
          if (prev.isTimerRunning && !prev.isForceSubmitted) {
            e.preventDefault();
            e.stopPropagation();
          }
          return prev;
        });
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown, true);
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (fullscreenRetryRef.current) window.clearTimeout(fullscreenRetryRef.current);
    };
  }, []);

  return {
    state,
    addWarning,
    updateHeadPosition,
    updateEyeDeviation,
    updateSoundLevel,
    enterFullscreen,
    exitFullscreen,
    startTimer,
    stopTimer,
    resetSecurity,
    setMaxWarnings,
  };
};
