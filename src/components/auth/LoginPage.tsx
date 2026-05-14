import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoleCard } from './RoleCard';
import { StudentRegistration } from './StudentRegistration';
import { TeacherRegistration } from './TeacherRegistration';
import { AdminLogin } from './AdminLogin';
import { ParentRegistration } from './ParentRegistration';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import schoolLogo from '@/assets/school-logo.png';
import { FeaturesSection } from '@/components/landing/FeaturesSection';

type AuthStep = 'role-select' | 'student-register' | 'teacher-register' | 'admin-login' | 'parent-register';

// Helper: after sign-in, verify the user's profile role matches expected role
const verifyRoleAfterSignIn = async (expectedRole: string): Promise<{ valid: boolean; actualRole?: string }> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { valid: false };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) return { valid: false };

  if (profile.role !== expectedRole) {
    // Role mismatch — sign out to prevent auto-redirect, no dashboard access
    await supabase.auth.signOut();
    return { valid: false, actualRole: profile.role };
  }

  return { valid: true };
};

export const LoginPage: React.FC = () => {
  const [step, setStep] = useState<AuthStep>('role-select');
  const [isVerifying, setIsVerifying] = useState(false);
  const navigate = useNavigate();
  const { signUp, signIn, verifyAdminCode, isLoading, isAuthenticated, profile } = useAuth();

  // Only auto-redirect if already authenticated AND profile is loaded (role confirmed)
  useEffect(() => {
    if (isAuthenticated && profile && !isVerifying) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, profile, isVerifying, navigate]);

  const handleRoleSelect = (role: 'student' | 'teacher' | 'admin' | 'parent') => {
    if (role === 'student') setStep('student-register');
    else if (role === 'teacher') setStep('teacher-register');
    else if (role === 'parent') setStep('parent-register');
    else setStep('admin-login');
  };

  const handleStudentComplete = async (data: { 
    email: string; 
    password?: string;
    name: string; 
    studentCard: string; 
    className: string; 
    phone: string 
  }) => {
    if (!data.password) {
      toast.error('Password is required');
      return;
    }

    try {
      setIsVerifying(true);
      // Try to sign in first (for existing users)
      const { error: signInError } = await signIn(data.email, data.password);
      
      if (!signInError) {
        const roleCheck = await verifyRoleAfterSignIn('student');
        if (!roleCheck.valid) {
          setIsVerifying(false);
          toast.error(roleCheck.actualRole 
            ? `This account is registered as "${roleCheck.actualRole}". Please use the correct role to sign in.`
            : 'Account not found. Please register first.');
          return;
        }
        setIsVerifying(false);
        toast.success('Welcome back!');
        navigate('/dashboard');
        return;
      }

      // For new registrations, verify student card was validated
      if (!data.studentCard) {
        toast.error('Please complete registration with a valid student card');
        return;
      }

      // Create new account
      const { error } = await signUp(data.email, data.password, {
        role: 'student',
        full_name: data.name,
        student_card: data.studentCard,
        current_class: data.className,
        phone: data.phone,
      });

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('already been registered')) {
          toast.error('This email is already registered. Please check your password and try again.');
        } else {
          toast.error(error.message);
        }
      } else {
        // Mark student card as registered
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.id) {
          await supabase
            .from('registered_students')
            .update({ is_registered: true, registered_user_id: userData.user.id })
            .eq('student_card', data.studentCard);
        }
          
        toast.success('Account created! Please check your email to verify.');
        navigate('/dashboard');
      }
    } catch (err) {
      setIsVerifying(false);
      console.error('Student login error:', err);
      toast.error('Connection error. Please check your internet and try again.');
    }
  };

  const handleTeacherComplete = async (data: { 
    email: string; 
    password?: string;
    name: string; 
    phone: string 
  }) => {
    if (!data.password) {
      toast.error('Password is required');
      return;
    }

    try {
      setIsVerifying(true);
      // Try to sign in first
      const { error: signInError } = await signIn(data.email, data.password);
      
      if (!signInError) {
        const roleCheck = await verifyRoleAfterSignIn('teacher');
        if (!roleCheck.valid) {
          setIsVerifying(false);
          toast.error(roleCheck.actualRole 
            ? `This account is registered as "${roleCheck.actualRole}". Please use the correct role to sign in.`
            : 'Account not found. Please register first.');
          return;
        }
        setIsVerifying(false);
        toast.success('Welcome back!');
        navigate('/dashboard');
        return;
      }

      // Check if user exists but wrong password
      if (signInError.message.includes('Invalid login credentials')) {
        // Try signup for new user
        const { error } = await signUp(data.email, data.password, {
          role: 'teacher',
          full_name: data.name,
          phone: data.phone,
        });

        if (error) {
          if (error.message.includes('already registered') || error.message.includes('already been registered')) {
            toast.error('This email is already registered. Please check your password and try again.');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Account created! Please check your email to verify.');
          navigate('/dashboard');
        }
        return;
      }

      toast.error(signInError.message || 'Login failed. Please try again.');
    } catch (err) {
      setIsVerifying(false);
      console.error('Teacher login error:', err);
      toast.error('Connection error. Please check your internet and try again.');
    }
  };

  const handleAdminComplete = async (data: { email: string; code: string; password?: string }) => {
    try {
      // Verify admin code
      const isValidCode = await verifyAdminCode(data.code);
      
      if (!isValidCode) {
        toast.error('Invalid admin security code');
        return;
      }

      // Admin count and code validation handled server-side by create_profile_with_role

      const password = data.password || data.code;

      setIsVerifying(true);
      // Try to sign in first
      const { error: signInError } = await signIn(data.email, password);
      
      if (!signInError) {
        const roleCheck = await verifyRoleAfterSignIn('admin');
        if (!roleCheck.valid) {
          setIsVerifying(false);
          toast.error(roleCheck.actualRole 
            ? `This account is registered as "${roleCheck.actualRole}", not as admin.`
            : 'Account not found.');
          return;
        }
        setIsVerifying(false);
        toast.success('Welcome, Admin!');
        navigate('/dashboard');
        return;
      }

      // If sign in fails, create account (admin_code validated server-side)
      const { error: signUpError } = await signUp(data.email, password, {
        role: 'admin',
        full_name: 'Administrator',
        admin_code: data.code,
      });

      if (signUpError) {
        const errorMsg = signUpError.message.toLowerCase();
        if (errorMsg.includes('already registered') || errorMsg.includes('already exists')) {
          toast.error('Admin exists. Please check your password.');
        } else {
          toast.error(signUpError.message);
        }
        return;
      }

      toast.success('Admin account created! Check email to confirm.');
      navigate('/dashboard');
    } catch (err) {
      setIsVerifying(false);
      console.error('Admin login error:', err);
      toast.error('Connection error. Please try again.');
    }
  };

  const handleParentComplete = async (data: { 
    email: string; 
    password?: string;
    name: string; 
    phone: string;
    selectedChildId: string;
    selectedChildName: string;
    isSignIn?: boolean;
  }) => {
    if (!data.password) {
      toast.error('Password is required');
      return;
    }

    // Pure sign-in flow (existing parent)
    if (data.isSignIn) {
      setIsVerifying(true);
      const { error: signInError } = await signIn(data.email, data.password);
      
      if (signInError) {
        setIsVerifying(false);
        toast.error('Invalid email or password. If you don\'t have an account, switch to Create Account.');
        return;
      }

      const roleCheck = await verifyRoleAfterSignIn('parent');
      if (!roleCheck.valid) {
        setIsVerifying(false);
        toast.error(roleCheck.actualRole 
          ? `This account is registered as "${roleCheck.actualRole}". Please use the correct role to sign in.`
          : 'Account not found. Please register first.');
        return;
      }
      setIsVerifying(false);
      toast.success('Welcome back!');
      navigate('/dashboard');
      return;
    }

    // Registration flow
    setIsVerifying(true);
    
    // Try sign in first (existing account)
    const { error: signInError } = await signIn(data.email, data.password);
    if (!signInError) {
      const roleCheck = await verifyRoleAfterSignIn('parent');
      if (!roleCheck.valid) {
        setIsVerifying(false);
        toast.error(roleCheck.actualRole 
          ? `This account is registered as "${roleCheck.actualRole}". Please use the correct role.`
          : 'Account issue. Please try again.');
        return;
      }
      // Already have account, just link child
      const user = (await supabase.auth.getUser()).data.user;
      if (user && data.selectedChildId) {
        await supabase.from('parent_children').insert({
          parent_id: user.id,
          student_id: data.selectedChildId,
          verified: false,
        });
      }
      setIsVerifying(false);
      toast.success('Welcome back! Child link request sent to admin.');
      navigate('/dashboard');
      return;
    }
    setIsVerifying(false);

    // Create new parent account
    const { error } = await signUp(data.email, data.password, {
      role: 'parent',
      full_name: data.name,
      phone: data.phone,
    });

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        toast.error('This email is already registered. Please check your password and use Sign In.');
      } else {
        toast.error(error.message);
      }
      return;
    }

    // Link parent to selected child
    const user = (await supabase.auth.getUser()).data.user;
    if (user && data.selectedChildId) {
      await supabase.from('parent_children').insert({
        parent_id: user.id,
        student_id: data.selectedChildId,
        verified: false,
      });
    }

    toast.success('Account created! Your link to ' + data.selectedChildName + ' is pending admin approval.');
    navigate('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-secondary/30">
      {/* Header Section */}
      <div className="bg-primary py-8 px-4">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center">
          <img 
            src={schoolLogo} 
            alt="World Mission High School" 
            className="w-24 h-24 object-contain mb-4 rounded-full bg-white p-2"
          />
          <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground">
            WORLD MISSION HIGH SCHOOL
          </h1>
          <p className="text-primary-foreground/90 text-lg mt-1">
            ONLINE EXAMINATION SYSTEM
          </p>
          <p className="text-[hsl(45,93%,58%)] text-sm mt-2 italic font-medium drop-shadow-sm">
            "Excellence in Education, Faith in Action"
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1 flex items-start justify-center p-6 pt-8">
        <div className="w-full max-w-4xl">
          {step === 'role-select' && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground">CONTINUE AS</h2>
                <p className="text-muted-foreground mt-2">Select your role to proceed</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <RoleCard
                  role="student"
                  title="Student"
                  description="Access exams and view grades"
                  onClick={() => handleRoleSelect('student')}
                />
                <RoleCard
                  role="teacher"
                  title="Teacher"
                  description="Create and monitor exams"
                  onClick={() => handleRoleSelect('teacher')}
                />
                <RoleCard
                  role="parent"
                  title="Parent"
                  description="View your child's progress"
                  onClick={() => handleRoleSelect('parent')}
                />
                <RoleCard
                  role="admin"
                  title="Admin"
                  description="System management"
                  onClick={() => handleRoleSelect('admin')}
                />
              </div>

              {/* Features Section */}
              <FeaturesSection />
            </div>
          )}

          {step === 'student-register' && (
            <div className="max-w-md mx-auto bg-primary/5 rounded-2xl shadow-lg p-6 animate-fade-in border border-primary/20 backdrop-blur-sm">
              <StudentRegistration
                onBack={() => setStep('role-select')}
                onComplete={handleStudentComplete}
              />
            </div>
          )}

          {step === 'teacher-register' && (
            <div className="max-w-md mx-auto bg-primary/5 rounded-2xl shadow-lg p-6 animate-fade-in border border-primary/20 backdrop-blur-sm">
              <TeacherRegistration
                onBack={() => setStep('role-select')}
                onComplete={handleTeacherComplete}
              />
            </div>
          )}

          {step === 'admin-login' && (
            <div className="max-w-md mx-auto bg-primary/5 rounded-2xl shadow-lg p-6 animate-fade-in border border-primary/20 backdrop-blur-sm">
              <AdminLogin
                onBack={() => setStep('role-select')}
                onComplete={handleAdminComplete}
              />
            </div>
          )}

          {step === 'parent-register' && (
            <div className="max-w-md mx-auto bg-primary/5 rounded-2xl shadow-lg p-6 animate-fade-in border border-primary/20 backdrop-blur-sm">
              <ParentRegistration
                onBack={() => setStep('role-select')}
                onComplete={handleParentComplete}
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-sm text-muted-foreground border-t border-border">
        <p>© 2025 World Mission High School. All rights reserved.</p>
      </footer>
    </div>
  );
};
