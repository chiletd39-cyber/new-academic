import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useExamSecurity } from '@/hooks/useExamSecurity';
import { useScreenProtection } from '@/hooks/useScreenProtection';
import { useObjectDetection } from '@/hooks/useObjectDetection';
import { SecuritySidebar, SecuritySidebarHandle } from '@/components/exam/SecuritySidebar';
import { ExamCountdown } from '@/components/exam/ExamCountdown';
import { ObjectDetectionOverlay } from '@/components/exam/ObjectDetectionOverlay';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, ChevronLeft, ChevronRight, Send, Eye, Monitor, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BroadcastListener } from '@/components/exam/BroadcastListener';
import { BroadcastPanel } from '@/components/exam/BroadcastPanel';
import { CursorDangerZone } from '@/components/exam/CursorDangerZone';
import { PermissionGate } from '@/components/exam/PermissionGate';

interface ExamQuestion {
  id: string;
  text: string;
  type: 'multiple_choice' | 'short_answer' | 'essay' | 'true_false';
  options?: string[];
  correctAnswer?: string | number;
  marks: number;
}

export const ExamPage: React.FC = () => {
  const navigate = useNavigate();
  const { examId } = useParams();
  const { toast } = useToast();
  const { role, profile, user } = useAuth();
  const [showCountdown, setShowCountdown] = useState(true);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const securitySidebarRef = useRef<SecuritySidebarHandle>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [taskData, setTaskData] = useState<{ 
    duration_minutes?: number; 
    max_warnings?: number;
    title?: string;
    total_marks?: number;
    required_fields?: { name?: boolean; class?: boolean; email?: boolean };
    security_settings?: Record<string, boolean>;
  } | null>(null);
  const snapshotIntervalRef = useRef<number | null>(null);

  // Check if user is teacher or admin (view only mode)
  const isViewOnly = role === 'teacher' || role === 'admin';

  const {
    state,
    addWarning,
    updateHeadPosition,
    updateEyeDeviation,
    updateSoundLevel,
    enterFullscreen,
    startTimer,
    setMaxWarnings,
  } = useExamSecurity(taskData?.max_warnings || 3);

  // Screen protection (HDMI, projector, casting detection)
  const { state: screenState, hasViolation: hasScreenViolation } = useScreenProtection({
    enabled: !isViewOnly && !showCountdown,
    onViolation: async (type, message) => {
      addWarning('tab', message);
      toast({
        title: 'Screen Protection Warning',
        description: message,
        variant: 'destructive',
      });
      
      if (user?.id && examId) {
        try {
          await supabase.functions.invoke('send-violation-email', {
            body: {
              taskId: examId,
              studentId: user.id,
              taskTitle: taskData?.title || 'Exam',
              violationType: type,
              violationMessage: message,
              warningCount: state.warningCount + 1,
              maxWarnings: state.maxWarnings,
            },
          });
        } catch (error) {
          console.error('Failed to send violation email:', error);
        }
      }
    },
  });

  // Object detection (phone, TV, multiple persons)
  const lastObjectWarningRef = useRef<number>(0);
  const objectDetection = useObjectDetection({
    enabled: !isViewOnly && !showCountdown,
    videoElement,
    detectionInterval: 3000,
    confidenceThreshold: 0.45,
    onThreatDetected: useCallback((threats: string[]) => {
      const now = Date.now();
      if (now - lastObjectWarningRef.current > 10000) {
        lastObjectWarningRef.current = now;
        addWarning('tab', `Object detected: ${threats.join(', ')}`);
        toast({
          title: 'Object Detection Warning',
          description: `Prohibited object detected: ${threats.join(', ')}`,
          variant: 'destructive',
        });
      }
    }, [addWarning, toast]),
  });

  // Poll video element from SecuritySidebar ref
  useEffect(() => {
    if (showCountdown || isViewOnly) return;
    const interval = window.setInterval(() => {
      const el = securitySidebarRef.current?.getVideoElement();
      if (el && el !== videoElement) {
        setVideoElement(el);
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [showCountdown, isViewOnly, videoElement]);

  // Fetch task data and questions
  useEffect(() => {
    const fetchTask = async () => {
      if (!examId) return;

      // Check if student already submitted
      if (!isViewOnly && user?.id) {
        const { data: existingSub } = await supabase
          .from('task_submissions')
          .select('id')
          .eq('student_id', user.id)
          .eq('task_id', examId)
          .limit(1);
        
        if (existingSub && existingSub.length > 0) {
          toast({
            title: 'Already Submitted',
            description: 'You have already submitted this task. Re-attempts are not allowed.',
            variant: 'destructive',
          });
          navigate('/dashboard');
          return;
        }
      }

      // Fetch task metadata from tasks_safe view
      const { data } = await supabase
        .from('tasks_safe' as any)
        .select('*')
        .eq('id', examId)
        .single();
      
      if (data) {
        setTaskData(data as any);
        if ((data as any).max_warnings) {
          setMaxWarnings((data as any).max_warnings);
        }
      }

      // Fetch actual questions via secure RPC
      setLoadingQuestions(true);
      try {
        const { data: questionsData, error } = await supabase.rpc('get_exam_questions', {
          _task_id: examId,
        });

        if (error) {
          console.error('Failed to fetch questions:', error);
          toast({
            title: 'Error',
            description: error.message || 'Failed to load exam questions',
            variant: 'destructive',
          });
          navigate('/dashboard');
          return;
        }

        const parsed: ExamQuestion[] = Array.isArray(questionsData) 
          ? questionsData.map((q: any, i: number) => ({
              id: q.id || `q-${i}`,
              text: q.text || '',
              type: q.type || 'multiple_choice',
              options: q.options || [],
              correctAnswer: q.correctAnswer,
              marks: q.marks || 1,
            }))
          : [];

        if (parsed.length === 0 && !isViewOnly) {
          toast({
            title: 'No Questions',
            description: 'This exam has no questions yet.',
            variant: 'destructive',
          });
          navigate('/dashboard');
          return;
        }

        setQuestions(parsed);
      } catch (err) {
        console.error('Error fetching questions:', err);
        toast({
          title: 'Error',
          description: 'Failed to load exam. Please try again.',
          variant: 'destructive',
        });
        navigate('/dashboard');
        return;
      } finally {
        setLoadingQuestions(false);
      }
    };
    fetchTask();
  }, [examId, setMaxWarnings, isViewOnly, user?.id, navigate, toast]);

  // Create exam session for students and start webcam snapshot capture
  useEffect(() => {
    if (!isViewOnly && user?.id && examId && !showCountdown) {
      const createSession = async () => {
        await supabase.from('exam_sessions').insert({
          student_id: user.id,
          task_id: examId,
          is_active: true,
          warnings: 0,
        });
      };
      createSession();

      // Start periodic webcam snapshot capture (every 5 seconds)
      const captureSnapshot = async () => {
        const videoEl = securitySidebarRef.current?.getVideoElement();
        if (!videoEl || videoEl.readyState < 2) return;
        
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 320;
          canvas.height = 240;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(videoEl, 0, 0, 320, 240);
          
          const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.6));
          if (!blob) return;
          
          const path = `${user.id}/${examId}.jpg`;
          await supabase.storage.from('exam-snapshots').upload(path, blob, {
            upsert: true,
            contentType: 'image/jpeg',
          });
        } catch (err) {
          // Silent fail - snapshot is best-effort
        }
      };

      snapshotIntervalRef.current = window.setInterval(captureSnapshot, 2000);

      return () => {
        if (snapshotIntervalRef.current) {
          window.clearInterval(snapshotIntervalRef.current);
        }
        supabase.from('exam_sessions')
          .update({ is_active: false })
          .eq('student_id', user.id)
          .eq('task_id', examId);
      };
    }
  }, [isViewOnly, user?.id, examId, showCountdown]);

  // Update warnings in database
  useEffect(() => {
    if (!isViewOnly && user?.id && examId && !showCountdown) {
      const updateWarnings = async () => {
        await supabase
          .from('exam_sessions')
          .update({ 
            warnings: state.warningCount,
            warning_details: state.warnings.map(w => ({ type: w.type, message: w.message, timestamp: w.timestamp.toISOString() })),
            last_heartbeat: new Date().toISOString(),
          })
          .eq('student_id', user.id)
          .eq('task_id', examId);
      };
      updateWarnings();
    }
  }, [state.warningCount, state.warnings, isViewOnly, user?.id, examId, showCountdown]);

  // Force submit notification
  useEffect(() => {
    if (!isViewOnly && state.isForceSubmitted && user?.id && examId) {
      const sendForceSubmitNotification = async () => {
        try {
          await supabase.functions.invoke('send-notification', {
            body: {
              type: 'force_submit',
              student_id: user.id,
              task_title: taskData?.title,
              reason: state.remainingTime === 0 
                ? 'Time expired' 
                : `Exceeded maximum warnings (${state.maxWarnings})`,
            },
          });
        } catch (error) {
          console.error('Failed to send force submit notification:', error);
        }
      };
      sendForceSubmitNotification();
    }
  }, [state.isForceSubmitted, isViewOnly, user?.id, examId, taskData?.title, state.remainingTime, state.maxWarnings]);

  // Required fields state
  const [requiredFieldsData, setRequiredFieldsData] = useState<Record<string, string>>({});
  const [requiredFieldsFilled, setRequiredFieldsFilled] = useState(false);
  const [showRequiredFields, setShowRequiredFields] = useState(false);

  // Check if required fields need to be shown
  useEffect(() => {
    if (!isViewOnly && taskData?.required_fields) {
      const rf = taskData.required_fields;
      const needsFields = rf.name || rf.class || rf.email;
      if (needsFields) {
        setShowRequiredFields(true);
        // Pre-fill from profile
        const prefill: Record<string, string> = {};
        if (rf.name && profile?.full_name) prefill.name = profile.full_name;
        if (rf.class && profile?.current_class) prefill.class = profile.current_class;
        if (rf.email && user?.email) prefill.email = user.email;
        setRequiredFieldsData(prefill);
        // If all pre-filled, mark as filled
        const allFilled = (!rf.name || !!prefill.name) && (!rf.class || !!prefill.class) && (!rf.email || !!prefill.email);
        setRequiredFieldsFilled(allFilled);
      } else {
        setRequiredFieldsFilled(true);
      }
    } else {
      setRequiredFieldsFilled(true);
    }
  }, [taskData, isViewOnly, profile, user]);

  const handleCountdownComplete = useCallback(() => {
    setShowCountdown(false);
    if (!isViewOnly) {
      enterFullscreen();
      const duration = taskData?.duration_minutes || 60;
      startTimer(duration * 60);
    }
  }, [enterFullscreen, startTimer, isViewOnly, taskData]);

  const handleWarning = useCallback(
    (type: 'head' | 'eye' | 'sound', message: string) => {
      if (isViewOnly) return;
      addWarning(type, message);
      toast({
        title: 'Security Warning',
        description: message,
        variant: 'destructive',
      });

      // Fire-and-forget notification - don't await to prevent UI blocking
      if (user?.id && examId) {
        supabase.functions.invoke('send-notification', {
          body: {
            type: 'warning',
            student_id: user.id,
            task_title: taskData?.title,
            warning_count: state.warningCount + 1,
            max_warnings: state.maxWarnings,
            reason: message,
          },
        }).catch(error => {
          console.error('Failed to send warning notification:', error);
        });
      }
    },
    [addWarning, toast, isViewOnly, user?.id, examId, taskData?.title, state.warningCount, state.maxWarnings]
  );

  const handleAnswerChange = (questionId: string, value: string | number) => {
    if (isViewOnly) return;
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const calculateScore = (): number => {
    let score = 0;
    questions.forEach(q => {
      const answer = answers[q.id];
      if (answer === undefined || answer === null) return;

      if (q.type === 'multiple_choice' || q.type === 'true_false') {
        if (q.correctAnswer !== undefined && Number(answer) === Number(q.correctAnswer)) {
          score += q.marks;
        }
      }
      // short_answer and essay require manual grading — score stays 0 for auto
    });
    return score;
  };

  const submittingRef = useRef(false);

  const handleSubmit = async () => {
    if (isViewOnly) {
      navigate('/dashboard');
      return;
    }

    // Prevent double submission
    if (submittingRef.current) return;
    submittingRef.current = true;

    const score = calculateScore();
    const totalMarks = taskData?.total_marks || questions.reduce((sum, q) => sum + q.marks, 0);

    // Save submission - use upsert to prevent duplicates
    if (user?.id && examId) {
      const { error: subError } = await supabase.from('task_submissions').upsert({
        student_id: user.id,
        task_id: examId,
        answers,
        score,
        warnings: state.warningCount,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      }, { onConflict: 'student_id,task_id' });

      if (subError) {
        console.error('Submission error:', subError);
      }

      // Deactivate session
      await supabase
        .from('exam_sessions')
        .update({ is_active: false })
        .eq('student_id', user.id)
        .eq('task_id', examId);

      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'exam_ended',
            student_id: user.id,
            task_title: taskData?.title,
          },
        });
      } catch (error) {
        console.error('Failed to send submission notification:', error);
      }
    }

    // Exit fullscreen on submit
    if (document.fullscreenElement) {
      try { await document.exitFullscreen(); } catch (e) { /* ignore */ }
    }

    toast({
      title: 'Exam Submitted',
      description: `Your exam has been submitted successfully.`,
    });
    navigate('/dashboard');
  };

  const progress = questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0;
  const question = questions[currentQuestion];

  // Force submit if max warnings reached (only for students)
  const forceSubmittedRef = useRef(false);
  if (!isViewOnly && state.isForceSubmitted && !forceSubmittedRef.current) {
    forceSubmittedRef.current = true;
    // Auto-submit on force - use upsert to prevent duplicates
    if (user?.id && examId) {
      const score = calculateScore();
      supabase.from('task_submissions').upsert({
        student_id: user.id,
        task_id: examId,
        answers,
        score,
        warnings: state.warningCount,
        status: 'force_submitted',
        submitted_at: new Date().toISOString(),
      }, { onConflict: 'student_id,task_id' }).then(() => {
        supabase.from('exam_sessions')
          .update({ is_active: false })
          .eq('student_id', user.id)
          .eq('task_id', examId);
      });
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-destructive/10 backdrop-blur-sm">
        <Card className="max-w-md mx-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Exam Force Submitted
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Your exam has been automatically submitted due to {state.remainingTime === 0 ? 'time expiration' : 'multiple security violations'}.
            </p>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Permission gate (students only) — must approve cam/mic/screen before countdown
  if (!isViewOnly && !permissionsGranted && taskData) {
    const sec = taskData.security_settings || {};
    const needsCam = sec.webcam !== false;
    const needsMic = sec.microphone !== false;
    const needsScreen = sec.screenProtection !== false;
    if (needsCam || needsMic || needsScreen) {
      return (
        <PermissionGate
          needsCamera={needsCam}
          needsMic={needsMic}
          needsScreen={needsScreen}
          onAllGranted={() => setPermissionsGranted(true)}
        />
      );
    }
  }

  if (showCountdown) {
    return <ExamCountdown onComplete={handleCountdownComplete} />;
  }

  // Loading questions
  if (loadingQuestions) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading exam questions...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <AlertTriangle className="w-10 h-10 mx-auto text-warning" />
            <p className="text-foreground font-medium">No questions available</p>
            <p className="text-sm text-muted-foreground">This exam doesn't have any questions yet.</p>
            <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render question based on type
  const renderQuestion = (q: ExamQuestion) => {
    switch (q.type) {
      case 'multiple_choice':
        return (
          <RadioGroup
            value={answers[q.id]?.toString() || ''}
            onValueChange={(value) => handleAnswerChange(q.id, parseInt(value))}
            disabled={isViewOnly}
          >
            {(q.options || []).map((option, index) => (
              <div
                key={index}
                className={`flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors ${
                  isViewOnly ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                <RadioGroupItem 
                  value={index.toString()} 
                  id={`option-${q.id}-${index}`}
                  disabled={isViewOnly}
                />
                <Label
                  htmlFor={`option-${q.id}-${index}`}
                  className={`flex-1 ${isViewOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'true_false':
        return (
          <RadioGroup
            value={answers[q.id]?.toString() || ''}
            onValueChange={(value) => handleAnswerChange(q.id, parseInt(value))}
            disabled={isViewOnly}
          >
            {['True', 'False'].map((option, index) => (
              <div
                key={index}
                className={`flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors ${
                  isViewOnly ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                <RadioGroupItem 
                  value={index.toString()} 
                  id={`tf-${q.id}-${index}`}
                  disabled={isViewOnly}
                />
                <Label
                  htmlFor={`tf-${q.id}-${index}`}
                  className={`flex-1 ${isViewOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'short_answer':
        return (
          <Input
            placeholder="Type your answer here..."
            value={(answers[q.id] as string) || ''}
            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
            disabled={isViewOnly}
            className="h-12"
          />
        );

      case 'essay':
        return (
          <Textarea
            placeholder="Write your answer here..."
            value={(answers[q.id] as string) || ''}
            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
            disabled={isViewOnly}
            className="min-h-[150px]"
          />
        );

      default:
        return <p className="text-muted-foreground">Unsupported question type</p>;
    }
  };

  return (
    <div className="flex h-screen bg-background select-none" onContextMenu={(e) => e.preventDefault()}>
      {/* Main Exam Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-card">
          <div className="flex items-center gap-3">
            <h1 className="font-semibold">{taskData?.title || 'Examination'}</h1>
            {isViewOnly && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-warning/20 text-warning-foreground border border-warning/30">
                <Eye className="w-3 h-3" />
                View Only
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Question {currentQuestion + 1} of {questions.length}
            </span>
            <Progress value={progress} className="w-32 h-2" />
          </div>
        </div>

        {/* Question Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-2xl mx-auto">
            {/* Required Fields Header */}
            {showRequiredFields && !requiredFieldsFilled && !isViewOnly && (
              <Card className="mb-6 border-primary/50">
                <CardHeader>
                  <CardTitle className="text-lg">Required Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {taskData?.required_fields?.name && (
                    <div className="space-y-1">
                      <Label>Full Name *</Label>
                      <Input
                        value={requiredFieldsData.name || ''}
                        onChange={(e) => setRequiredFieldsData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter your full name"
                        disabled={!!profile?.full_name}
                      />
                    </div>
                  )}
                  {taskData?.required_fields?.class && (
                    <div className="space-y-1">
                      <Label>Class *</Label>
                      <Input
                        value={requiredFieldsData.class || ''}
                        onChange={(e) => setRequiredFieldsData(prev => ({ ...prev, class: e.target.value }))}
                        placeholder="Enter your class"
                        disabled={!!profile?.current_class}
                      />
                    </div>
                  )}
                  {taskData?.required_fields?.email && (
                    <div className="space-y-1">
                      <Label>Email *</Label>
                      <Input
                        value={requiredFieldsData.email || ''}
                        onChange={(e) => setRequiredFieldsData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Enter your email"
                        type="email"
                        disabled={!!user?.email}
                      />
                    </div>
                  )}
                  <Button
                    onClick={() => {
                      const rf = taskData?.required_fields;
                      const valid = (!rf?.name || requiredFieldsData.name?.trim()) && 
                                    (!rf?.class || requiredFieldsData.class?.trim()) && 
                                    (!rf?.email || requiredFieldsData.email?.trim());
                      if (valid) {
                        setRequiredFieldsFilled(true);
                      } else {
                        toast({ title: 'Missing Fields', description: 'Please fill all required fields', variant: 'destructive' });
                      }
                    }}
                  >
                    Continue to Exam
                  </Button>
                </CardContent>
              </Card>
            )}

            {requiredFieldsFilled && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-medium">
                    Question {currentQuestion + 1}
                  </CardTitle>
                  <span className="text-sm text-muted-foreground">
                    {question.marks} mark{question.marks > 1 ? 's' : ''}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-lg">{question.text}</p>

                {renderQuestion(question)}

                {isViewOnly && (
                  <p className="text-sm text-muted-foreground italic mt-4">
                    Teachers and admins can view questions but cannot submit answers.
                  </p>
                )}
              </CardContent>
            </Card>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="h-16 border-t border-border flex items-center justify-between px-6 bg-card">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestion((prev) => Math.max(0, prev - 1))}
            disabled={currentQuestion === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>

          <div className="flex gap-2 flex-wrap justify-center max-w-[50%]">
            {questions.map((q, index) => (
              <button
                key={q.id}
                onClick={() => setCurrentQuestion(index)}
                className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  index === currentQuestion
                    ? 'bg-primary text-primary-foreground'
                    : answers[q.id] !== undefined
                    ? 'bg-success/20 text-success border border-success'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {currentQuestion === questions.length - 1 ? (
            <Button onClick={() => setShowSubmitDialog(true)}>
              {isViewOnly ? 'Exit Preview' : 'Submit Exam'}
              <Send className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={() =>
                setCurrentQuestion((prev) =>
                  Math.min(questions.length - 1, prev + 1)
                )
              }
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* Broadcast Listener for students */}
      {!isViewOnly && <BroadcastListener taskId={examId} />}

      {/* Broadcast Panel for teachers/admins */}
      {isViewOnly && (
        <div className="w-80 h-full bg-card border-l border-border flex flex-col p-4">
          <BroadcastPanel taskId={examId} />
        </div>
      )}

      {/* Security Sidebar - Hidden for view only mode */}
      {!isViewOnly && (
        <SecuritySidebar
          ref={securitySidebarRef}
          warningCount={state.warningCount}
          maxWarnings={state.maxWarnings}
          remainingTime={state.remainingTime}
          studentToken={state.studentToken}
          screenProtection={{
            isExternalDisplayDetected: screenState.isExternalDisplayDetected,
            isScreenSharing: screenState.isScreenSharing,
            isPictureInPicture: screenState.isPictureInPicture,
            displayCount: screenState.displayCount,
          }}
          onHeadMovement={updateHeadPosition}
          onEyeDeviation={updateEyeDeviation}
          onSoundLevel={updateSoundLevel}
          onWarning={handleWarning}
        />
      )}

      {/* Cursor danger zone overlay — replaces mouse-based eye tracking */}
      {!isViewOnly && !showCountdown && (
        <CursorDangerZone onWarning={(msg) => handleWarning('eye', msg)} />
      )}

      {/* Object Detection Overlay */}
      {!isViewOnly && (
        <ObjectDetectionOverlay
          threats={objectDetection.detectedThreats}
          visible={objectDetection.threatDetected}
        />
      )}

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isViewOnly ? 'Exit Preview?' : 'Submit Examination?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isViewOnly 
                ? 'You are viewing this exam as a teacher/admin. Click confirm to return to dashboard.'
                : `You have answered ${Object.keys(answers).length} of ${questions.length} questions. This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isViewOnly ? 'Continue Viewing' : 'Continue Exam'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>
              {isViewOnly ? 'Exit' : 'Submit'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
