import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Loader2, 
  Mail, 
  Lock, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { authService } from '@/api';

type Step = 'email' | 'verify' | 'reset' | 'success';

interface ForgotPasswordProps {
  onBack: () => void;
}

export function ForgotPassword({ onBack }: ForgotPasswordProps) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await authService.forgotPassword({ email });
      if (response.success) {
        setSuccessMessage(response.data?.message || 'Verification code sent');
        setStep('verify');
        setCountdown(60); // 60 second countdown for resend
      } else {
        setError(response.message || 'Failed to send verification code');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pastedCode = value.slice(0, 6).split('');
      const newCode = [...verificationCode];
      pastedCode.forEach((char, i) => {
        if (index + i < 6) {
          newCode[index + i] = char;
        }
      });
      setVerificationCode(newCode);
      const nextIndex = Math.min(index + pastedCode.length, 5);
      codeInputRefs.current[nextIndex]?.focus();
    } else {
      const newCode = [...verificationCode];
      newCode[index] = value;
      setVerificationCode(newCode);
      
      // Auto-focus next input
      if (value && index < 5) {
        codeInputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const code = verificationCode.join('');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      setIsLoading(false);
      return;
    }

    try {
      const response = await authService.verifyResetCode({ email, code });
      if (response.success) {
        setStep('reset');
      } else {
        setError(response.message || 'Invalid verification code');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const code = verificationCode.join('');
      const response = await authService.resetPassword({ email, code, newPassword });
      if (response.success) {
        setSuccessMessage(response.data?.message || 'Password reset successfully');
        setStep('success');
      } else {
        setError(response.message || 'Failed to reset password');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;
    setError(null);
    setIsLoading(true);

    try {
      const response = await authService.forgotPassword({ email });
      if (response.success) {
        setSuccessMessage('New verification code sent');
        setVerificationCode(['', '', '', '', '', '']);
        setCountdown(60);
      } else {
        setError(response.message || 'Failed to resend code');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = () => {
    if (!newPassword) return { strength: 0, label: '', color: '' };
    let strength = 0;
    if (newPassword.length >= 6) strength++;
    if (newPassword.length >= 8) strength++;
    if (/[A-Z]/.test(newPassword)) strength++;
    if (/[0-9]/.test(newPassword)) strength++;
    if (/[^A-Za-z0-9]/.test(newPassword)) strength++;
    
    if (strength <= 2) return { strength: 33, label: 'Weak', color: 'bg-destructive' };
    if (strength <= 3) return { strength: 66, label: 'Medium', color: 'bg-yellow-500' };
    return { strength: 100, label: 'Strong', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength();

  const renderEmailStep = () => (
    <form onSubmit={handleSendCode}>
      <CardContent className="space-y-4 px-4 sm:px-6">
        {error && (
          <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="text-center mb-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Enter your email address and we'll send you a verification code to reset your password.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reset-email" className="text-sm font-medium">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="reset-email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-11 bg-background/50"
              required
              disabled={isLoading}
              autoFocus
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-3 pt-2 px-4 sm:px-6">
        <Button 
          type="submit" 
          className="w-full h-11 font-medium" 
          disabled={isLoading || !email}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending code...
            </>
          ) : (
            'Send Verification Code'
          )}
        </Button>
        <Button 
          type="button" 
          variant="ghost" 
          className="w-full" 
          onClick={onBack}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to login
        </Button>
      </CardFooter>
    </form>
  );

  const renderVerifyStep = () => (
    <form onSubmit={handleVerifyCode}>
      <CardContent className="space-y-4 px-4 sm:px-6">
        {error && (
          <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}
        
        {successMessage && (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-sm text-green-700 dark:text-green-400">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        <div className="text-center mb-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            We've sent a 6-digit code to <strong>{email}</strong>
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Verification Code</Label>
          <div className="flex gap-2 justify-center">
            {verificationCode.map((digit, index) => (
              <Input
                key={index}
                ref={(el) => { codeInputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => handleCodeKeyDown(index, e)}
                className="w-11 h-12 text-center text-lg font-semibold bg-background/50"
                disabled={isLoading}
                autoFocus={index === 0}
              />
            ))}
          </div>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={handleResendCode}
            disabled={countdown > 0 || isLoading}
            className={cn(
              "text-sm transition-colors",
              countdown > 0 
                ? "text-muted-foreground cursor-not-allowed"
                : "text-primary hover:text-primary/80"
            )}
          >
            {countdown > 0 ? `Resend code in ${countdown}s` : "Didn't receive the code? Resend"}
          </button>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-3 pt-2 px-4 sm:px-6">
        <Button 
          type="submit" 
          className="w-full h-11 font-medium" 
          disabled={isLoading || verificationCode.join('').length !== 6}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify Code'
          )}
        </Button>
        <Button 
          type="button" 
          variant="ghost" 
          className="w-full" 
          onClick={() => {
            setStep('email');
            setError(null);
            setSuccessMessage(null);
          }}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Change email
        </Button>
      </CardFooter>
    </form>
  );

  const renderResetStep = () => (
    <form onSubmit={handleResetPassword}>
      <CardContent className="space-y-4 px-4 sm:px-6">
        {error && (
          <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        <div className="text-center mb-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Create a new password for your account
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-password" className="text-sm font-medium">New Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pl-10 pr-10 h-11 bg-background/50"
              required
              disabled={isLoading}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {newPassword && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div 
                    className={cn("h-full transition-all duration-300", passwordStrength.color)}
                    style={{ width: `${passwordStrength.strength}%` }}
                  />
                </div>
                <span className={cn("text-xs font-medium whitespace-nowrap", 
                  passwordStrength.strength <= 33 ? "text-destructive" :
                  passwordStrength.strength <= 66 ? "text-yellow-600" : "text-green-600"
                )}>
                  {passwordStrength.label}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-new-password" className="text-sm font-medium">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="confirm-new-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={cn(
                "pl-10 h-11 bg-background/50",
                confirmPassword && newPassword !== confirmPassword && "border-destructive"
              )}
              required
              disabled={isLoading}
            />
          </div>
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-destructive">Passwords do not match</p>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-3 pt-2 px-4 sm:px-6">
        <Button 
          type="submit" 
          className="w-full h-11 font-medium" 
          disabled={isLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Resetting password...
            </>
          ) : (
            'Reset Password'
          )}
        </Button>
      </CardFooter>
    </form>
  );

  const renderSuccessStep = () => (
    <CardContent className="space-y-4 px-4 sm:px-6 py-8">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
          <ShieldCheck className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Password Reset Complete!</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Your password has been successfully reset. You can now sign in with your new password.
        </p>
        <Button onClick={onBack} className="w-full h-11 font-medium">
          Back to Sign In
        </Button>
      </div>
    </CardContent>
  );

  const getStepTitle = () => {
    switch (step) {
      case 'email': return 'Forgot Password?';
      case 'verify': return 'Enter Verification Code';
      case 'reset': return 'Create New Password';
      case 'success': return 'Success';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 'email': return "No worries, we'll send you reset instructions";
      case 'verify': return 'Check your email for the code';
      case 'reset': return 'Choose a strong password';
      case 'success': return 'Your account is secure';
    }
  };

  return (
    <Card className="w-full border-0 shadow-2xl shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl">
      <CardHeader className="space-y-1 pb-4 sm:pb-6 px-4 sm:px-6">
        <CardTitle className="text-xl sm:text-2xl font-bold text-center">
          {getStepTitle()}
        </CardTitle>
        <CardDescription className="text-center text-sm">
          {getStepDescription()}
        </CardDescription>
        
        {/* Progress indicator */}
        {step !== 'success' && (
          <div className="flex justify-center gap-2 pt-2">
            {['email', 'verify', 'reset'].map((s, i) => (
              <div
                key={s}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  s === step ? "w-8 bg-primary" : "w-4",
                  ['email', 'verify', 'reset'].indexOf(step) > i ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        )}
      </CardHeader>
      
      {step === 'email' && renderEmailStep()}
      {step === 'verify' && renderVerifyStep()}
      {step === 'reset' && renderResetStep()}
      {step === 'success' && renderSuccessStep()}
    </Card>
  );
}

export default ForgotPassword;
