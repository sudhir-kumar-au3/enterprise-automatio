import React, { useState } from 'react';
import { useAuth } from '../../contexts';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, Mail, Lock, User, AlertCircle, CheckSquare, Eye, EyeOff } from 'lucide-react';
import { ThemeToggle } from '../ui/theme-toggle';
import { cn } from '@/lib/utils';

interface AuthFormProps {
  onToggleMode?: () => void;
}

export function LoginForm({ onToggleMode }: AuthFormProps) {
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
            <button type="button" className="text-sm text-primary hover:text-primary/80 transition-colors">
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

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

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
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 lg:h-12 lg:w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <CheckSquare className="h-5 w-5 lg:h-6 lg:w-6" />
            </div>
            <span className="text-xl lg:text-2xl font-bold">Pulsework.io</span>
          </div>
          
          {/* Main content */}
          <div className="space-y-4 lg:space-y-6 max-w-md">
            <h1 className="text-3xl lg:text-4xl font-bold leading-tight">
              Collaborate seamlessly with your team
            </h1>
            <p className="text-base lg:text-lg text-white/80">
              Manage tasks, track progress, and boost productivity with our enterprise collaboration platform.
            </p>
            
            {/* Feature list */}
            <div className="space-y-3 lg:space-y-4 pt-2 lg:pt-4">
              {[
                'Real-time task management',
                'Team collaboration tools',
                'Progress tracking & analytics',
                'Secure & reliable platform'
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex h-5 w-5 lg:h-6 lg:w-6 items-center justify-center rounded-full bg-white/20 flex-shrink-0">
                    <svg className="h-3 w-3 lg:h-3.5 lg:w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm lg:text-base text-white/90">{feature}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Footer */}
          <p className="text-xs lg:text-sm text-white/60">
            © 2026 Pulsework.io. Enterprise Collaboration Platform.
          </p>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-background via-background to-muted/30 min-h-screen lg:min-h-0">
        {/* Top bar */}
        <div className="flex justify-between items-center p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 lg:hidden">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <CheckSquare className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <span className="text-lg sm:text-xl font-bold">Pulsework.io</span>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
        
        {/* Form container */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 py-6 sm:py-8">
          <div className="w-full max-w-[400px] sm:max-w-md relative">
            <div className={cn(
              "transition-all duration-300 ease-out w-full",
              isLogin ? "opacity-100 translate-x-0 relative" : "opacity-0 translate-x-4 absolute inset-0 pointer-events-none"
            )}>
              {isLogin && <LoginForm onToggleMode={() => setIsLogin(false)} />}
            </div>
            <div className={cn(
              "transition-all duration-300 ease-out w-full",
              !isLogin ? "opacity-100 translate-x-0 relative" : "opacity-0 -translate-x-4 absolute inset-0 pointer-events-none"
            )}>
              {!isLogin && <RegisterForm onToggleMode={() => setIsLogin(true)} />}
            </div>
          </div>
        </div>
        
        {/* Bottom links */}
        <div className="p-4 sm:p-6 text-center text-xs sm:text-sm text-muted-foreground">
          <span>By continuing, you agree to our </span>
          <a href="#" className="text-primary hover:underline whitespace-nowrap">Terms of Service</a>
          <span> and </span>
          <a href="#" className="text-primary hover:underline whitespace-nowrap">Privacy Policy</a>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
