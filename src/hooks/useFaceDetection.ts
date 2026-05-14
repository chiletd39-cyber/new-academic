import { useState, useRef, useCallback, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';

interface FaceDetectionState {
  isLoading: boolean;
  isDetecting: boolean;
  headRotation: { yaw: number; pitch: number };
  eyeGaze: { x: number; y: number; deviation: number };
  faceDetected: boolean;
  error: string | null;
}

export const useFaceDetection = (
  videoElement: HTMLVideoElement | null,
  onHeadWarning?: () => void,
  onEyeWarning?: () => void
) => {

  const [state, setState] = useState<FaceDetectionState>({
    isLoading: true,
    isDetecting: false,
    headRotation: { yaw: 0, pitch: 0 },
    eyeGaze: { x: 0, y: 0, deviation: 0 },
    faceDetected: false,
    error: null,
  });

  const detectorRef = useRef<any>(null);

  const animationFrameRef = useRef<number>(0);

  const lastDetectionRef = useRef<number>(0);

  const lastHeadWarningRef = useRef<number>(0);
  const lastEyeWarningRef = useRef<number>(0);

  const headTurnStartRef = useRef<number | null>(null);
  const eyeDeviationStartRef = useRef<number | null>(null);

  const previousYawRef = useRef<number>(0);
  const previousPitchRef = useRef<number>(0);

  const faceLostTimeoutRef = useRef<number | null>(null);

  // ===== SMOOTHING =====

  const smoothValue = (
    previous: number,
    current: number,
    factor = 0.8
  ) => {
    return previous * factor + current * (1 - factor);
  };

  // ===== CLEANUP =====

  const cleanupDetector = useCallback(async () => {

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (detectorRef.current) {

      try {

        await detectorRef.current.dispose();

      } catch (err) {

        console.error('Detector cleanup error:', err);
      }

      detectorRef.current = null;
    }

  }, []);

  // ===== INITIALIZE =====

  const initTensorFlow = useCallback(async () => {

    try {

      await tf.ready();

      detectorRef.current =
        await faceLandmarksDetection.createDetector(
          faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
          {
            runtime: 'tfjs',
            refineLandmarks: true,
            maxFaces: 1,
          }
        );

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: null,
      }));

    } catch (err: any) {

      console.error(err);

      setState(prev => ({
        ...prev,
        isLoading: false,
        isDetecting: false,
        error:
          err?.message ||
          'Failed to initialize face detection',
      }));
    }

  }, []);

  // ===== START DETECTION =====

  const startDetection = useCallback(() => {

    if (
      !videoElement ||
      state.isLoading ||
      !detectorRef.current ||
      state.isDetecting
    ) return;

    setState(prev => ({
      ...prev,
      isDetecting: true,
      error: null,
    }));

    const detect = async () => {

      try {

        // ===== STOP IF TAB HIDDEN =====

        if (document.hidden) {

          animationFrameRef.current =
            requestAnimationFrame(detect);

          return;
        }

        // ===== VIDEO READY CHECK =====

        if (
          !videoElement ||
          videoElement.readyState < 2 ||
          !videoElement.srcObject
        ) {

          setState(prev => ({
            ...prev,
            error: 'Camera not ready',
          }));

          animationFrameRef.current =
            requestAnimationFrame(detect);

          return;
        }

        // ===== FPS LIMITER =====
        // 10 FPS

        const nowPerformance = performance.now();

        if (
          nowPerformance - lastDetectionRef.current < 100
        ) {

          animationFrameRef.current =
            requestAnimationFrame(detect);

          return;
        }

        lastDetectionRef.current = nowPerformance;

        // ===== FACE DETECTION =====

        const faces =
          await detectorRef.current.estimateFaces(
            videoElement,
            {
              flipHorizontal: false,
            }
          );

        const hasFace = faces.length > 0;

        let yaw = previousYawRef.current;
        let pitch = previousPitchRef.current;

        let eyeDeviation = 0;

        // ===== FACE FOUND =====

        if (hasFace) {

          if (faceLostTimeoutRef.current) {
            clearTimeout(faceLostTimeoutRef.current);
          }

          const face = faces[0];

          const keypoints = face.keypoints;

          // ===== LANDMARKS =====

          const nose = keypoints[1];

          const leftCheek = keypoints[234];
          const rightCheek = keypoints[454];

          const forehead = keypoints[10];
          const chin = keypoints[152];

          const leftEye = keypoints[33];
          const rightEye = keypoints[263];

          const leftIris = keypoints[468];
          const rightIris = keypoints[473];

          // ===== HEAD ROTATION =====

          const faceCenterX =
            (leftCheek.x + rightCheek.x) / 2;

          const faceCenterY =
            (forehead.y + chin.y) / 2;

          const faceWidth =
            Math.abs(rightCheek.x - leftCheek.x);

          const faceHeight =
            Math.abs(chin.y - forehead.y);

          let rawYaw =
            ((nose.x - faceCenterX) / faceWidth) * 120;

          let rawPitch =
            ((nose.y - faceCenterY) / faceHeight) * 120;

          // ===== SMOOTH VALUES =====

          yaw = smoothValue(
            previousYawRef.current,
            rawYaw
          );

          pitch = smoothValue(
            previousPitchRef.current,
            rawPitch
          );

          previousYawRef.current = yaw;
          previousPitchRef.current = pitch;

          // ===== EYE TRACKING =====

          if (leftIris && rightIris) {

            const leftEyeWidth =
              Math.abs(rightEye.x - leftEye.x);

            const rightEyeWidth =
              leftEyeWidth;

            const leftIrisOffset =
              Math.abs(leftIris.x - leftEye.x);

            const rightIrisOffset =
              Math.abs(rightIris.x - rightEye.x);

            const leftRatio =
              leftIrisOffset / leftEyeWidth;

            const rightRatio =
              rightIrisOffset / rightEyeWidth;

            eyeDeviation =
              ((leftRatio + rightRatio) / 2) * 100;
          }

          // ===== DRAW FACE BOX =====

          const canvas =
            document.getElementById(
              'face-overlay'
            ) as HTMLCanvasElement;

          if (canvas) {

            const ctx =
              canvas.getContext('2d');

            if (ctx) {

              canvas.width =
                videoElement.videoWidth;

              canvas.height =
                videoElement.videoHeight;

              ctx.clearRect(
                0,
                0,
                canvas.width,
                canvas.height
              );

              const padding = 40;

              const boxX =
                leftCheek.x - padding;

              const boxY =
                forehead.y - padding;

              const boxWidth =
                faceWidth + padding * 2;

              const boxHeight =
                faceHeight + padding * 2;

              // Main border

              ctx.strokeStyle = '#00ff00';
              ctx.lineWidth = 3;

              ctx.strokeRect(
                boxX,
                boxY,
                boxWidth,
                boxHeight
              );

              // Corner camera effect

              const corner = 30;

              ctx.beginPath();

              // Top left
              ctx.moveTo(boxX, boxY + corner);
              ctx.lineTo(boxX, boxY);
              ctx.lineTo(boxX + corner, boxY);

              // Top right
              ctx.moveTo(boxX + boxWidth - corner, boxY);
              ctx.lineTo(boxX + boxWidth, boxY);
              ctx.lineTo(boxX + boxWidth, boxY + corner);

              // Bottom left
              ctx.moveTo(boxX, boxY + boxHeight - corner);
              ctx.lineTo(boxX, boxY + boxHeight);
              ctx.lineTo(boxX + corner, boxY + boxHeight);

              // Bottom right
              ctx.moveTo(boxX + boxWidth - corner, boxY + boxHeight);
              ctx.lineTo(boxX + boxWidth, boxY + boxHeight);
              ctx.lineTo(boxX + boxWidth, boxY + boxHeight - corner);

              ctx.stroke();
            }
          }

        } else {

          // ===== FACE LOST DELAY =====

          if (!faceLostTimeoutRef.current) {

            faceLostTimeoutRef.current =
              window.setTimeout(() => {

                setState(prev => ({
                  ...prev,
                  faceDetected: false,
                }));

              }, 1000);
          }
        }

        // ===== WARNING SYSTEM =====

        const now = Date.now();

        // HEAD WARNING

        if (
          Math.abs(yaw) > 20 ||
          Math.abs(pitch) > 18
        ) {

          if (!headTurnStartRef.current) {

            headTurnStartRef.current = now;

          } else if (
            now - headTurnStartRef.current > 3000 &&
            now - lastHeadWarningRef.current > 5000
          ) {

            onHeadWarning?.();

            lastHeadWarningRef.current = now;

            headTurnStartRef.current = null;
          }

        } else {

          headTurnStartRef.current = null;
        }

        // EYE WARNING

        if (eyeDeviation > 12) {

          if (!eyeDeviationStartRef.current) {

            eyeDeviationStartRef.current = now;

          } else if (
            now - eyeDeviationStartRef.current > 1500 &&
            now - lastEyeWarningRef.current > 5000
          ) {

            onEyeWarning?.();

            lastEyeWarningRef.current = now;

            eyeDeviationStartRef.current = null;
          }

        } else {

          eyeDeviationStartRef.current = null;
        }

        // ===== UPDATE STATE =====

        setState(prev => ({
          ...prev,
          faceDetected: hasFace,
          headRotation: {
            yaw,
            pitch,
          },
          eyeGaze: {
            x: yaw,
            y: pitch,
            deviation: eyeDeviation,
          },
        }));

      } catch (err: any) {

        console.error(err);

        setState(prev => ({
          ...prev,
          isDetecting: false,
          error:
            err?.message ||
            'Detection failed',
        }));

        return;
      }

      animationFrameRef.current =
        requestAnimationFrame(detect);
    };

    detect();

  }, [
    videoElement,
    state.isLoading,
    state.isDetecting,
    onHeadWarning,
    onEyeWarning,
  ]);

  // ===== STOP DETECTION =====

  const stopDetection = useCallback(() => {

    if (animationFrameRef.current) {

      cancelAnimationFrame(
        animationFrameRef.current
      );
    }

    setState(prev => ({
      ...prev,
      isDetecting: false,
      faceDetected: false,
    }));

  }, []);

  // ===== INITIALIZE MODEL =====

  useEffect(() => {

    initTensorFlow();

  }, [initTensorFlow]);

  // ===== CLEANUP =====

  useEffect(() => {

    return () => {

      cleanupDetector();

      if (faceLostTimeoutRef.current) {
        clearTimeout(faceLostTimeoutRef.current);
      }
    };

  }, [cleanupDetector]);

  
  return {
    ...state,
    startDetection,
    stopDetection,
  };
};