import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts';
import { authService } from '../../api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, Mail, Lock, User, AlertCircle, Activity, Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { ThemeToggle } from '../ui/theme-toggle';
import { cn } from '@/lib/utils';

interface AuthFormProps {
  onToggleMode?: () => void;
  onForgotPassword?: () => void;
}

export function LoginForm({ onToggleMode, onForgotPassword }: AuthFormProps) {
  const { login, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    await login({ email, password });
  };

  return (
    <Card className="w-full border-0 shadow-2xl shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl">
      <CardHeader className="space-y-1 pb-4 sm:pb-6 px-4 sm:px-6">
        <CardTitle className="text-xl sm:text-2xl font-bold text-center">Welcome back</CardTitle>
        <CardDescription className="text-center text-sm">
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
          {error && (
            <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-10 sm:h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 text-base sm:text-sm"
                required
                disabled={isLoading}
              />
            </div>
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-10 sm:h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 text-base sm:text-sm"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-end">
            <button 
              type="button" 
              onClick={onForgotPassword}
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              Forgot password?
            </button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3 sm:space-y-4 pt-2 px-4 sm:px-6">
          <Button 
            type="submit" 
            className="w-full h-10 sm:h-11 font-medium shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </Button>
          {onToggleMode && (
            <p className="text-sm text-center text-muted-foreground">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={onToggleMode}
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Sign up
              </button>
            </p>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}

export function RegisterForm({ onToggleMode }: AuthFormProps) {
  const { register, isLoading, error, clearError } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError('');

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return;
    }

    await register({ name, email, password });
  };

  const displayError = validationError || error;

  // Password strength indicator
  const getPasswordStrength = () => {
    if (!password) return { strength: 0, label: '', color: '' };
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    if (strength <= 2) return { strength: 33, label: 'Weak', color: 'bg-destructive' };
    if (strength <= 3) return { strength: 66, label: 'Medium', color: 'bg-warning' };
    return { strength: 100, label: 'Strong', color: 'bg-success' };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <Card className="w-full border-0 shadow-2xl shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl">
      <CardHeader className="space-y-1 pb-4 sm:pb-6 px-4 sm:px-6">
        <CardTitle className="text-xl sm:text-2xl font-bold text-center">Create an account</CardTitle>
        <CardDescription className="text-center text-sm">
          Enter your details to get started
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
          {displayError && (
            <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{displayError}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-10 h-10 sm:h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 text-base sm:text-sm"
                required
                disabled={isLoading}
              />
            </div>
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="register-email" className="text-sm font-medium">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="register-email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-10 sm:h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 text-base sm:text-sm"
                required
                disabled={isLoading}
              />
            </div>
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="register-password" className="text-sm font-medium">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-10 sm:h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 text-base sm:text-sm"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password && (
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
                    passwordStrength.strength <= 66 ? "text-warning" : "text-success"
                  )}>
                    {passwordStrength.label}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="confirm-password" className="text-sm font-medium">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={cn(
                  "pl-10 h-10 sm:h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 text-base sm:text-sm",
                  confirmPassword && password !== confirmPassword && "border-destructive focus:border-destructive"
                )}
                required
                disabled={isLoading}
              />
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-destructive">Passwords do not match</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3 sm:space-y-4 pt-2 px-4 sm:px-6">
          <Button 
            type="submit" 
            className="w-full h-10 sm:h-11 font-medium shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all" 
            disabled={isLoading || (confirmPassword !== '' && password !== confirmPassword)}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </Button>
          {onToggleMode && (
            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onToggleMode}
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Sign in
              </button>
            </p>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}

// Forgot Password Form
export function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authService.forgotPassword({ email });
      if (response.success) {
        setSuccess(true);
        // In development, show the reset token for testing
        if (response.data?.resetToken) {
          setDevToken(response.data.resetToken);
        }
      } else {
        setError(response.errors?.[0]?.message || 'Failed to send reset email');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full border-0 shadow-2xl shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl">
        <CardHeader className="space-y-1 pb-4 sm:pb-6 px-4 sm:px-6">
          <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-2">
            <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold text-center">Check your email</CardTitle>
          <CardDescription className="text-center text-sm">
            If an account exists for <span className="font-medium text-foreground">{email}</span>, 
            you'll receive a password reset link shortly.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {devToken && (
            <Alert className="mb-4 border-amber-500/50 bg-amber-500/10">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm">
                <strong>Development Mode:</strong> Use this token to reset your password:
                <code className="block mt-1 p-2 bg-muted rounded text-xs break-all">{devToken}</code>
              </AlertDescription>
            </Alert>
          )}
          <p className="text-sm text-muted-foreground text-center">
            Didn't receive the email? Check your spam folder or try again.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3 pt-2 px-4 sm:px-6">
          <Button variant="outline" onClick={onBack} className="w-full gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full border-0 shadow-2xl shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl">
      <CardHeader className="space-y-1 pb-4 sm:pb-6 px-4 sm:px-6">
        <CardTitle className="text-xl sm:text-2xl font-bold text-center">Forgot password?</CardTitle>
        <CardDescription className="text-center text-sm">
          Enter your email and we'll send you a reset link
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
          {error && (
            <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="reset-email" className="text-sm font-medium">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="reset-email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-10 sm:h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 text-base sm:text-sm"
                required
                disabled={isLoading}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3 sm:space-y-4 pt-2 px-4 sm:px-6">
          <Button 
            type="submit" 
            className="w-full h-10 sm:h-11 font-medium shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send reset link'
            )}
          </Button>
          <Button variant="ghost" onClick={onBack} className="w-full gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

// Reset Password Form (accessed via token in URL)
export function ResetPasswordForm({ token, onBack, onSuccess }: { token: string; onBack: () => void; onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState('');
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const response = await authService.verifyResetToken(token);
        if (response.success) {
          setTokenValid(true);
        } else {
          setError('This reset link is invalid or has expired.');
        }
      } catch (err) {
        setError('This reset link is invalid or has expired.');
      } finally {
        setIsVerifying(false);
      }
    };
    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.resetPassword({ token, password });
      if (response.success) {
        onSuccess();
      } else {
        setError(response.errors?.[0]?.message || 'Failed to reset password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = () => {
    if (!password) return { strength: 0, label: '', color: '' };
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    if (strength <= 2) return { strength: 33, label: 'Weak', color: 'bg-destructive' };
    if (strength <= 3) return { strength: 66, label: 'Medium', color: 'bg-warning' };
    return { strength: 100, label: 'Strong', color: 'bg-success' };
  };

  const passwordStrength = getPasswordStrength();

  if (isVerifying) {
    return (
      <Card className="w-full border-0 shadow-2xl shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl">
        <CardContent className="py-12 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Verifying reset link...</p>
        </CardContent>
      </Card>
    );
  }

  if (!tokenValid) {
    return (
      <Card className="w-full border-0 shadow-2xl shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl">
        <CardHeader className="space-y-1 pb-4 sm:pb-6 px-4 sm:px-6">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold text-center">Link expired</CardTitle>
          <CardDescription className="text-center text-sm">
            {error || 'This password reset link is invalid or has expired.'}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col space-y-3 pt-2 px-4 sm:px-6">
          <Button onClick={onBack} className="w-full gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full border-0 shadow-2xl shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl">
      <CardHeader className="space-y-1 pb-4 sm:pb-6 px-4 sm:px-6">
        <CardTitle className="text-xl sm:text-2xl font-bold text-center">Reset your password</CardTitle>
        <CardDescription className="text-center text-sm">
          Enter your new password below
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
          {error && (
            <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="new-password" className="text-sm font-medium">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-10 sm:h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 text-base sm:text-sm"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password && (
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
                    passwordStrength.strength <= 66 ? "text-warning" : "text-success"
                  )}>
                    {passwordStrength.label}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-1.5 sm:space-y-2">
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
                  "pl-10 h-10 sm:h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 text-base sm:text-sm",
                  confirmPassword && password !== confirmPassword && "border-destructive focus:border-destructive"
                )}
                required
                disabled={isLoading}
              />
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-destructive">Passwords do not match</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3 sm:space-y-4 pt-2 px-4 sm:px-6">
          <Button 
            type="submit" 
            className="w-full h-10 sm:h-11 font-medium shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all" 
            disabled={isLoading || (confirmPassword !== '' && password !== confirmPassword)}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              'Reset password'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

// Password Reset Success
export function ResetPasswordSuccess({ onBackToLogin }: { onBackToLogin: () => void }) {
  return (
    <Card className="w-full border-0 shadow-2xl shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl">
      <CardHeader className="space-y-1 pb-4 sm:pb-6 px-4 sm:px-6">
        <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-2">
          <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <CardTitle className="text-xl sm:text-2xl font-bold text-center">Password reset!</CardTitle>
        <CardDescription className="text-center text-sm">
          Your password has been successfully reset. You can now sign in with your new password.
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex flex-col space-y-3 pt-2 px-4 sm:px-6">
        <Button onClick={onBackToLogin} className="w-full gap-2">
          Sign in
        </Button>
      </CardFooter>
    </Card>
  );
}

// Terms of Service Page
export function TermsOfService({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={onBack} className="mb-6 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last updated: January 14, 2026</p>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using Pulsework.io ("the Service"), you agree to be bound by these Terms of Service. 
              If you disagree with any part of the terms, you may not access the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground">
              Pulsework.io is an enterprise collaboration platform that provides task management, team coordination, 
              real-time communication, workload balancing, and productivity analytics for organizations.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>You must provide accurate and complete information when creating an account.</li>
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>You must notify us immediately of any unauthorized access to your account.</li>
              <li>You may not share your account with others or allow multiple people to use the same account.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">4. Acceptable Use</h2>
            <p className="text-muted-foreground mb-3">You agree not to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Use the Service for any illegal or unauthorized purpose.</li>
              <li>Attempt to gain unauthorized access to any part of the Service.</li>
              <li>Interfere with or disrupt the integrity or performance of the Service.</li>
              <li>Upload or transmit viruses, malware, or other malicious code.</li>
              <li>Harass, abuse, or harm other users of the Service.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">5. Data Ownership</h2>
            <p className="text-muted-foreground">
              You retain ownership of all content and data you submit to the Service. By using the Service, 
              you grant us a limited license to store, process, and display your content as necessary to provide the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">6. Service Availability</h2>
            <p className="text-muted-foreground">
              We strive to maintain 99.9% uptime but do not guarantee uninterrupted access. We may perform 
              scheduled maintenance with advance notice. We are not liable for any downtime or service interruptions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">7. Termination</h2>
            <p className="text-muted-foreground">
              We may terminate or suspend your account at any time for violations of these terms. 
              Upon termination, your right to use the Service will cease immediately. You may export your data 
              before account termination.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">8. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              Pulsework.io shall not be liable for any indirect, incidental, special, consequential, or punitive 
              damages resulting from your use of the Service. Our total liability shall not exceed the amount 
              paid by you in the twelve months preceding the claim.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">9. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify these terms at any time. We will notify users of significant changes 
              via email or in-app notification. Continued use of the Service after changes constitutes acceptance 
              of the new terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">10. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have questions about these Terms of Service, please contact us at{' '}
              <a href="mailto:legal@pulsework.io" className="text-primary hover:underline">legal@pulsework.io</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

// Privacy Policy Page
export function PrivacyPolicy({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={onBack} className="mb-6 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Sign In
        </Button>
        
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: January 14, 2026</p>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
            <h3 className="text-lg font-medium mb-2">Account Information</h3>
            <p className="text-muted-foreground mb-3">
              When you create an account, we collect your name, email address, and password (encrypted).
            </p>
            <h3 className="text-lg font-medium mb-2">Usage Data</h3>
            <p className="text-muted-foreground mb-3">
              We collect information about how you use the Service, including tasks created, comments made, 
              and features accessed. This helps us improve the product.
            </p>
            <h3 className="text-lg font-medium mb-2">Device Information</h3>
            <p className="text-muted-foreground">
              We collect device type, browser type, IP address, and operating system for security and optimization purposes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>To provide and maintain the Service</li>
              <li>To authenticate your identity and secure your account</li>
              <li>To send you important updates about the Service</li>
              <li>To provide customer support</li>
              <li>To analyze usage patterns and improve the Service</li>
              <li>To detect and prevent fraud or abuse</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">3. Data Storage & Security</h2>
            <p className="text-muted-foreground mb-3">
              Your data is stored on secure servers with industry-standard encryption. We implement:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>AES-256 encryption for data at rest</li>
              <li>TLS 1.3 for data in transit</li>
              <li>Regular security audits and penetration testing</li>
              <li>Multi-factor authentication options</li>
              <li>Automated backups with geographic redundancy</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">4. Data Sharing</h2>
            <p className="text-muted-foreground mb-3">
              We do not sell your personal data. We may share data with:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Service Providers:</strong> Third parties who help us operate the Service (hosting, analytics)</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">5. Your Rights</h2>
            <p className="text-muted-foreground mb-3">You have the right to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update or correct inaccurate data</li>
              <li><strong>Deletion:</strong> Request deletion of your data</li>
              <li><strong>Export:</strong> Download your data in a portable format</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">6. Cookies & Tracking</h2>
            <p className="text-muted-foreground">
              We use essential cookies for authentication and session management. We use analytics cookies 
              to understand how you use the Service. You can control cookie preferences in your browser settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">7. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your data for as long as your account is active. Upon account deletion, we remove 
              your personal data within 30 days, except where retention is required by law. Anonymized 
              analytics data may be retained indefinitely.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">8. Children's Privacy</h2>
            <p className="text-muted-foreground">
              The Service is not intended for users under 16 years of age. We do not knowingly collect 
              data from children. If you believe a child has provided us data, please contact us.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">9. International Transfers</h2>
            <p className="text-muted-foreground">
              Your data may be processed in countries other than your own. We ensure appropriate safeguards 
              are in place, including Standard Contractual Clauses for EU data transfers.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">10. Contact Us</h2>
            <p className="text-muted-foreground">
              For privacy-related inquiries, contact our Data Protection Officer at{' '}
              <a href="mailto:privacy@pulsework.io" className="text-primary hover:underline">privacy@pulsework.io</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

interface AuthPageProps {
  onCreateOrganization?: () => void;
}

export function AuthPage({ onCreateOrganization }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [showResetSuccess, setShowResetSuccess] = useState(false);

  // Check for reset token in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setResetToken(token);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  if (showTerms) {
    return <TermsOfService onBack={() => setShowTerms(false)} />;
  }

  if (showPrivacy) {
    return <PrivacyPolicy onBack={() => setShowPrivacy(false)} />;
  }

  // Determine which form to show
  const renderForm = () => {
    if (showResetSuccess) {
      return (
        <ResetPasswordSuccess 
          onBackToLogin={() => {
            setShowResetSuccess(false);
            setResetToken(null);
            setIsLogin(true);
          }} 
        />
      );
    }

    if (resetToken) {
      return (
        <ResetPasswordForm 
          token={resetToken} 
          onBack={() => {
            setResetToken(null);
            setIsLogin(true);
          }}
          onSuccess={() => {
            setShowResetSuccess(true);
          }}
        />
      );
    }

    if (showForgotPassword) {
      return (
        <ForgotPasswordForm 
          onBack={() => setShowForgotPassword(false)} 
        />
      );
    }

    return (
      <div className="w-full max-w-[400px] sm:max-w-md relative">
        <div className={cn(
          "transition-all duration-300 ease-out w-full",
          isLogin ? "opacity-100 translate-x-0 relative" : "opacity-0 translate-x-4 absolute inset-0 pointer-events-none"
        )}>
          {isLogin && (
            <LoginForm 
              onToggleMode={() => setIsLogin(false)} 
              onForgotPassword={() => setShowForgotPassword(true)}
            />
          )}
        </div>
        <div className={cn(
          "transition-all duration-300 ease-out w-full",
          !isLogin ? "opacity-100 translate-x-0 relative" : "opacity-0 -translate-x-4 absolute inset-0 pointer-events-none"
        )}>
          {!isLogin && <RegisterForm onToggleMode={() => setIsLogin(true)} />}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col lg:flex-row">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] bg-gradient-to-br from-primary via-primary/90 to-primary/80 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,white)]" />
        <div className="absolute top-0 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col justify-between p-8 lg:p-12 text-white w-full">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
              <Activity className="h-5 w-5" />
            </div>
            <div className="flex flex-col justify-center h-10">
              <span className="text-xl font-bold leading-tight">Pulsework.io</span>
              <span className="text-[10px] text-white/70 leading-tight">Your team's rhythm</span>
            </div>
          </div>
          
          {/* Main content */}
          <div className="space-y-4 lg:space-y-6 max-w-md">
            <h1 className="text-3xl lg:text-4xl font-bold leading-tight">
              Where great teams find their flow
            </h1>
            <p className="text-base lg:text-lg text-white/80">
              Stop juggling tools. Start shipping work. Pulsework brings your team's tasks, 
              conversations, and insights into one powerful workspace.
            </p>
            
            {/* Feature list - catchy lines */}
            <div className="space-y-3 lg:space-y-4 pt-2 lg:pt-4">
              {[
                { text: 'Tasks that move as fast as you', icon: '⚡' },
                { text: 'Collaboration without the chaos', icon: '🎯' },
                { text: 'Insights that actually matter', icon: '📊' },
                { text: 'Security you can sleep on', icon: '🔒' }
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 flex-shrink-0 text-sm">
                    {feature.icon}
                  </div>
                  <span className="text-sm lg:text-base text-white/90">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Footer */}
          <p className="text-xs lg:text-sm text-white/60">
            © 2026 Pulsework.io · Your team's rhythm
          </p>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-background via-background to-muted/30 min-h-screen lg:min-h-0">
        {/* Top bar */}
        <div className="flex justify-between items-center p-4 sm:p-6">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Activity className="h-4 w-4" />
            </div>
            <div className="flex flex-col justify-center h-9">
              <span className="text-base font-bold leading-tight">Pulsework.io</span>
              <span className="text-[9px] text-muted-foreground leading-tight">Your team's rhythm</span>
            </div>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
        
        {/* Form container */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 py-6 sm:py-8">
          {renderForm()}
        </div>
        
        {/* Organization signup link */}
        {onCreateOrganization && (
          <div className="px-4 sm:px-6 pb-2 text-center">
            <button
              onClick={onCreateOrganization}
              className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Create a new organization →
            </button>
          </div>
        )}
        
        {/* Bottom links */}
        <div className="p-4 sm:p-6 text-center text-xs sm:text-sm text-muted-foreground">
          <span>By continuing, you agree to our </span>
          <button
            onClick={() => setShowTerms(true)}
            className="text-primary hover:underline whitespace-nowrap"
          >
            Terms of Service
          </button>
          <span> and </span>
          <button
            onClick={() => setShowPrivacy(true)}
            className="text-primary hover:underline whitespace-nowrap"
          >
            Privacy Policy
          </button>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
