/**
 * Organization Signup Page
 * Allows new organizations to register for the platform
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Building2,
  User,
  Mail,
  Lock,
  Globe,
  Check,
  X,
  Loader2,
  Sparkles,
  Shield,
  Users,
  Zap,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Plus,
  Trash2,
  Copy,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/api/client';

interface OrganizationSignupProps {
  onSuccess?: (data: { organization: any; owner: any }) => void;
  onBackToLogin?: () => void;
}

type Step = 'organization' | 'owner' | 'plan' | 'invite' | 'complete';

interface InvitedMember {
  email: string;
  role: 'admin' | 'member' | 'viewer';
}

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for small teams getting started',
    features: ['Up to 5 team members', 'Up to 100 tasks', 'Basic task management', 'Team collaboration'],
    highlighted: false,
    maxMembers: 5,
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '$12',
    period: 'per user/month',
    description: 'For growing teams that need more',
    features: ['Up to 25 team members', 'Up to 1,000 tasks', 'Analytics & reports', 'Calendar view', 'Data export'],
    highlighted: false,
    maxMembers: 25,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '$29',
    period: 'per user/month',
    description: 'For teams that need advanced features',
    features: ['Up to 100 team members', 'Unlimited tasks', 'Custom branding', 'API access', 'Priority support'],
    highlighted: true,
    maxMembers: 100,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: 'contact us',
    description: 'For large organizations with custom needs',
    features: ['Unlimited everything', 'SSO & SAML', 'Custom domain', 'Dedicated support', 'SLA guarantee', 'Audit logs'],
    highlighted: false,
    maxMembers: -1,
  },
];

export function OrganizationSignup({ onSuccess, onBackToLogin }: OrganizationSignupProps) {
  const [step, setStep] = useState<Step>('organization');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrg, setCreatedOrg] = useState<any>(null);

  // Organization form
  const [orgName, setOrgName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [industry, setIndustry] = useState('');
  const [teamSize, setTeamSize] = useState('');

  // Owner form
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Plan selection
  const [selectedPlan, setSelectedPlan] = useState('free');

  // Team invites (optional step)
  const [invitedMembers, setInvitedMembers] = useState<InvitedMember[]>([]);
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [newInviteRole, setNewInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [inviteLink, setInviteLink] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Auto-generate slug from org name
  useEffect(() => {
    const generatedSlug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 50);
    setSlug(generatedSlug);
  }, [orgName]);

  // Check slug availability with debounce
  useEffect(() => {
    if (!slug || slug.length < 3) {
      setSlugAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingSlug(true);
      try {
        const response = await apiClient.get(`/organizations/check-slug/${slug}`);
        setSlugAvailable((response.data as any)?.available ?? false);
      } catch {
        setSlugAvailable(null);
      } finally {
        setCheckingSlug(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [slug]);

  // Generate invite link when org is created
  useEffect(() => {
    if (createdOrg?.id && slug) {
      setInviteLink(`${window.location.origin}/join/${slug}?ref=${createdOrg.id}`);
    }
  }, [createdOrg, slug]);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/organizations/signup', {
        organizationName: orgName,
        slug,
        ownerName,
        ownerEmail,
        ownerPassword,
        plan: selectedPlan,
        industry,
        teamSize,
      });

      if (response.success) {
        setCreatedOrg(response.data);
        setStep('invite'); // Go to invite step instead of complete
      } else {
        setError((response as any).error || 'Failed to create organization');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddInvite = () => {
    if (!newInviteEmail || !newInviteEmail.includes('@')) return;
    
    // Check if already added
    if (invitedMembers.some(m => m.email === newInviteEmail)) {
      setError('This email is already in the invite list');
      return;
    }

    // Check plan limits
    const plan = plans.find(p => p.id === selectedPlan);
    if (plan && plan.maxMembers !== -1 && invitedMembers.length >= plan.maxMembers - 1) {
      setError(`Your plan allows up to ${plan.maxMembers} members (including you)`);
      return;
    }

    setInvitedMembers([...invitedMembers, { email: newInviteEmail, role: newInviteRole }]);
    setNewInviteEmail('');
    setError(null);
  };

  const handleRemoveInvite = (email: string) => {
    setInvitedMembers(invitedMembers.filter(m => m.email !== email));
  };

  const handleSendInvites = async () => {
    if (invitedMembers.length === 0) {
      setStep('complete');
      onSuccess?.(createdOrg);
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post(`/organizations/${createdOrg?.id}/invite-bulk`, {
        invites: invitedMembers,
      });
      setStep('complete');
      onSuccess?.(createdOrg);
    } catch (err: any) {
      setError(err.message || 'Failed to send invites. You can invite team members later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSkipInvites = () => {
    setStep('complete');
    onSuccess?.(createdOrg);
  };

  const canProceedOrg = orgName.length >= 2 && slug.length >= 3 && slugAvailable === true;
  const canProceedOwner = 
    ownerName.length >= 2 && 
    ownerEmail.includes('@') && 
    ownerPassword.length >= 6 && 
    ownerPassword === confirmPassword;

  const steps: Step[] = ['organization', 'owner', 'plan', 'invite'];

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.slice(0, -1).map((s, i) => (
        <React.Fragment key={s}>
          <div
            className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
              step === s ? "bg-primary text-primary-foreground" :
              steps.indexOf(step) > i ? "bg-primary/20 text-primary" :
              "bg-muted text-muted-foreground"
            )}
          >
            {steps.indexOf(step) > i ? (
              <Check className="h-4 w-4" />
            ) : (
              i + 1
            )}
          </div>
          {i < 2 && (
            <div className={cn(
              "h-0.5 w-8 transition-colors",
              steps.indexOf(step) > i ? "bg-primary" : "bg-muted"
            )} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  // Completion screen
  if (step === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 to-primary/10">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Welcome to Pulsework!</h2>
            <p className="text-muted-foreground mb-6">
              Your organization <strong>{orgName}</strong> has been created successfully.
            </p>
            
            {invitedMembers.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-4 mb-4 text-left">
                <p className="text-sm font-medium mb-2">📧 Invites sent to:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {invitedMembers.map(m => (
                    <li key={m.email}>{m.email} ({m.role})</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-primary/10 rounded-lg p-4 mb-6">
              <p className="text-sm text-muted-foreground mb-1">Your workspace URL:</p>
              <code className="text-primary font-medium">{slug}.pulsework.io</code>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
              <Clock className="h-4 w-4" />
              <span>Setup took less than 2 minutes!</span>
            </div>

            <Button className="w-full" onClick={onBackToLogin}>
              Go to Login
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invite team step
  if (step === 'invite') {
    const plan = plans.find(p => p.id === selectedPlan);
    const remainingSlots = plan?.maxMembers === -1 ? '∞' : plan!.maxMembers - 1 - invitedMembers.length;

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 to-primary/10">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Invite your team</CardTitle>
            <CardDescription>
              Add team members to get started together (you can skip this and invite later)
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Quick invite by email */}
            <div className="space-y-3">
              <Label>Invite by email</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="colleague@company.com"
                  value={newInviteEmail}
                  onChange={(e) => setNewInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddInvite()}
                  className="flex-1"
                />
                <select
                  value={newInviteRole}
                  onChange={(e) => setNewInviteRole(e.target.value as any)}
                  className="px-3 py-2 border rounded-md bg-background text-sm"
                >
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
                <Button onClick={handleAddInvite} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {typeof remainingSlots === 'number' ? `${remainingSlots} invite slots remaining` : 'Unlimited invites'}
              </p>
            </div>

            {/* Invited members list */}
            {invitedMembers.length > 0 && (
              <div className="space-y-2">
                <Label>Pending invites ({invitedMembers.length})</Label>
                <div className="border rounded-lg divide-y">
                  {invitedMembers.map((member) => (
                    <div key={member.email} className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{member.email}</p>
                          <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveInvite(member.email)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Share invite link */}
            <div className="space-y-3">
              <Label>Or share invite link</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={inviteLink}
                  className="flex-1 bg-muted/50"
                />
                <Button variant="outline" onClick={handleCopyLink}>
                  {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Anyone with this link can request to join your organization
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={handleSkipInvites} className="flex-1">
                Skip for now
              </Button>
              <Button 
                onClick={handleSendInvites} 
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : invitedMembers.length > 0 ? (
                  <>
                    Send {invitedMembers.length} invite{invitedMembers.length > 1 ? 's' : ''}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 to-primary/10">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Pulsework</span>
          </div>
          <CardTitle className="text-2xl">Create your organization</CardTitle>
          <CardDescription>
            Set up your workspace in just a few steps
          </CardDescription>
        </CardHeader>

        <CardContent>
          {renderStepIndicator()}

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step 1: Organization Details */}
          {step === 'organization' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name *</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="orgName"
                    placeholder="Acme Corporation"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Organization URL *</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="slug"
                    placeholder="acme-corp"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="pl-10 pr-24"
                  />
                  <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">
                    .pulsework.io
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {checkingSlug ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : slugAvailable === true ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">URL is available</span>
                    </>
                  ) : slugAvailable === false ? (
                    <>
                      <X className="h-4 w-4 text-red-600" />
                      <span className="text-red-600">URL is already taken</span>
                    </>
                  ) : slug.length > 0 && slug.length < 3 ? (
                    <span className="text-muted-foreground">URL must be at least 3 characters</span>
                  ) : null}
                </div>
              </div>

              {/* Optional fields for better onboarding */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry (optional)</Label>
                  <select
                    id="industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                  >
                    <option value="">Select industry</option>
                    <option value="technology">Technology</option>
                    <option value="finance">Finance</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="education">Education</option>
                    <option value="retail">Retail</option>
                    <option value="manufacturing">Manufacturing</option>
                    <option value="consulting">Consulting</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teamSize">Team Size (optional)</Label>
                  <select
                    id="teamSize"
                    value={teamSize}
                    onChange={(e) => setTeamSize(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                  >
                    <option value="">Select size</option>
                    <option value="1-5">1-5 people</option>
                    <option value="6-20">6-20 people</option>
                    <option value="21-50">21-50 people</option>
                    <option value="51-200">51-200 people</option>
                    <option value="200+">200+ people</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={onBackToLogin} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Login
                </Button>
                <Button 
                  onClick={() => setStep('owner')} 
                  disabled={!canProceedOrg}
                  className="flex-1"
                >
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Owner Account */}
          {step === 'owner' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ownerName">Your Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="ownerName"
                    placeholder="John Doe"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ownerEmail">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="ownerEmail"
                    type="email"
                    placeholder="john@acme.com"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ownerPassword">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="ownerPassword"
                      type="password"
                      placeholder="••••••••"
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
              {confirmPassword && ownerPassword !== confirmPassword && (
                <p className="text-sm text-red-600">Passwords do not match</p>
              )}

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setStep('organization')} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button 
                  onClick={() => setStep('plan')} 
                  disabled={!canProceedOwner}
                  className="flex-1"
                >
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Plan Selection */}
          {step === 'plan' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={cn(
                      "relative p-4 rounded-lg border-2 cursor-pointer transition-all",
                      selectedPlan === plan.id 
                        ? "border-primary bg-primary/5" 
                        : "border-muted hover:border-muted-foreground/30",
                      plan.highlighted && "ring-2 ring-primary/20"
                    )}
                  >
                    {plan.highlighted && (
                      <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary">
                        Popular
                      </Badge>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{plan.name}</h3>
                      {selectedPlan === plan.id && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="mb-2">
                      <span className="text-2xl font-bold">{plan.price}</span>
                      <span className="text-sm text-muted-foreground ml-1">{plan.period}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{plan.description}</p>
                    <ul className="space-y-1">
                      {plan.features.slice(0, 3).map((feature, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-xs">
                          <Check className="h-3 w-3 text-green-600" />
                          {feature}
                        </li>
                      ))}
                      {plan.features.length > 3 && (
                        <li className="text-xs text-muted-foreground">
                          +{plan.features.length - 3} more features
                        </li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setStep('owner')} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Create Organization
                      <Sparkles className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          <Separator className="my-6" />

          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Shield className="h-4 w-4" />
              Secure & Private
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              Team Collaboration
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="h-4 w-4" />
              Instant Setup
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default OrganizationSignup;
