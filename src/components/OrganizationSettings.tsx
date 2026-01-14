/**
 * Organization Settings Component
 * Admin interface for managing organization branding, legal docs, and support
 */

import React, { useState, useEffect } from 'react';
import { useOrganization } from '@/contexts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Building2,
  Palette,
  FileText,
  HeadphonesIcon,
  CreditCard,
  BarChart3,
  Upload,
  Globe,
  Mail,
  Phone,
  ExternalLink,
  Shield,
  Users,
  ListTodo,
  HardDrive,
  Zap,
  Crown,
  Loader2,
  Save,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

export function OrganizationSettingsPage() {
  const {
    organization,
    isLoading,
    usageStats,
    updateBranding,
    updateLegal,
    updateSettings,
    fetchUsageStats,
    hasFeature,
  } = useOrganization();

  const [activeTab, setActiveTab] = useState('branding');
  const [isSaving, setIsSaving] = useState(false);

  // Branding form state
  const [branding, setBranding] = useState({
    companyName: '',
    tagline: '',
    primaryColor: '#3b82f6',
    accentColor: '#8b5cf6',
    logo: '',
    favicon: '',
  });

  // Legal form state
  const [legal, setLegal] = useState({
    termsOfServiceUrl: '',
    privacyPolicyUrl: '',
    customTermsOfService: '',
    customPrivacyPolicy: '',
    cookiePolicyUrl: '',
  });

  // Support form state
  const [support, setSupport] = useState({
    email: '',
    phone: '',
    websiteUrl: '',
    documentationUrl: '',
    chatEnabled: false,
  });

  // Load organization data into form
  useEffect(() => {
    if (organization) {
      setBranding({
        companyName: organization.branding.companyName || '',
        tagline: organization.branding.tagline || '',
        primaryColor: organization.branding.primaryColor || '#3b82f6',
        accentColor: organization.branding.accentColor || '#8b5cf6',
        logo: organization.branding.logo || '',
        favicon: organization.branding.favicon || '',
      });
      setLegal({
        termsOfServiceUrl: organization.legal.termsOfServiceUrl || '',
        privacyPolicyUrl: organization.legal.privacyPolicyUrl || '',
        customTermsOfService: organization.legal.customTermsOfService || '',
        customPrivacyPolicy: organization.legal.customPrivacyPolicy || '',
        cookiePolicyUrl: organization.legal.cookiePolicyUrl || '',
      });
      setSupport({
        email: organization.support.email || '',
        phone: organization.support.phone || '',
        websiteUrl: organization.support.websiteUrl || '',
        documentationUrl: organization.support.documentationUrl || '',
        chatEnabled: organization.support.chatEnabled || false,
      });
    }
  }, [organization]);

  // Fetch usage stats on mount
  useEffect(() => {
    fetchUsageStats();
  }, [fetchUsageStats]);

  const handleSaveBranding = async () => {
    setIsSaving(true);
    try {
      await updateBranding(branding);
      toast.success('Branding settings saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save branding settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveLegal = async () => {
    setIsSaving(true);
    try {
      await updateLegal(legal);
      toast.success('Legal documents saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save legal documents');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSupport = async () => {
    setIsSaving(true);
    try {
      await updateSettings({ ...support } as any);
      toast.success('Support settings saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save support settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!organization) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Organization not found. Please contact support.
        </AlertDescription>
      </Alert>
    );
  }

  const planColors = {
    free: 'bg-slate-500',
    starter: 'bg-blue-500',
    professional: 'bg-purple-500',
    enterprise: 'bg-amber-500',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Organization Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your organization's branding, legal documents, and support configuration
          </p>
        </div>
        <Badge className={`${planColors[organization.subscription.plan]} text-white`}>
          <Crown className="h-3 w-3 mr-1" />
          {organization.subscription.plan.charAt(0).toUpperCase() + organization.subscription.plan.slice(1)} Plan
        </Badge>
      </div>

      {/* Usage Stats Cards */}
      {usageStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Team Members</span>
              </div>
              <div className="text-2xl font-bold">
                {usageStats.users.current}
                <span className="text-sm font-normal text-muted-foreground">
                  /{usageStats.users.limit === -1 ? '∞' : usageStats.users.limit}
                </span>
              </div>
              <Progress value={usageStats.users.percentage} className="h-1 mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <ListTodo className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Tasks</span>
              </div>
              <div className="text-2xl font-bold">
                {usageStats.tasks.current}
                <span className="text-sm font-normal text-muted-foreground">
                  /{usageStats.tasks.limit === -1 ? '∞' : usageStats.tasks.limit}
                </span>
              </div>
              <Progress value={usageStats.tasks.percentage} className="h-1 mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">Features</span>
              </div>
              <div className="text-2xl font-bold">{usageStats.features.length}</div>
              <p className="text-xs text-muted-foreground mt-1">enabled features</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Subscription</span>
              </div>
              <div className="text-lg font-bold capitalize">{organization.subscription.status}</div>
              {organization.subscription.trialEndsAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Trial ends: {new Date(organization.subscription.trialEndsAt).toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="branding" className="gap-2">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="legal" className="gap-2">
            <FileText className="h-4 w-4" />
            Legal
          </TabsTrigger>
          <TabsTrigger value="support" className="gap-2">
            <HeadphonesIcon className="h-4 w-4" />
            Support
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>
        </TabsList>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-4">
          {!hasFeature('custom_branding') && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Custom branding is available on Professional plan and above.
                <Button variant="link" className="p-0 h-auto ml-1">Upgrade now</Button>
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Brand Identity</CardTitle>
              <CardDescription>
                Customize how your organization appears to team members
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={branding.companyName}
                    onChange={(e) => setBranding({ ...branding, companyName: e.target.value })}
                    placeholder="Acme Corporation"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    value={branding.tagline}
                    onChange={(e) => setBranding({ ...branding, tagline: e.target.value })}
                    placeholder="Building the future"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={branding.primaryColor}
                      onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                      className="w-12 h-10 p-1 cursor-pointer"
                      disabled={!hasFeature('custom_branding')}
                    />
                    <Input
                      value={branding.primaryColor}
                      onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                      placeholder="#3b82f6"
                      disabled={!hasFeature('custom_branding')}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accentColor">Accent Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="accentColor"
                      type="color"
                      value={branding.accentColor}
                      onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                      className="w-12 h-10 p-1 cursor-pointer"
                      disabled={!hasFeature('custom_branding')}
                    />
                    <Input
                      value={branding.accentColor}
                      onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                      placeholder="#8b5cf6"
                      disabled={!hasFeature('custom_branding')}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="logo">Logo URL</Label>
                  <Input
                    id="logo"
                    value={branding.logo}
                    onChange={(e) => setBranding({ ...branding, logo: e.target.value })}
                    placeholder="https://example.com/logo.png"
                    disabled={!hasFeature('custom_branding')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="favicon">Favicon URL</Label>
                  <Input
                    id="favicon"
                    value={branding.favicon}
                    onChange={(e) => setBranding({ ...branding, favicon: e.target.value })}
                    placeholder="https://example.com/favicon.ico"
                    disabled={!hasFeature('custom_branding')}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveBranding} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Branding
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Legal Tab */}
        <TabsContent value="legal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Legal Documents</CardTitle>
              <CardDescription>
                Configure your organization's terms of service, privacy policy, and other legal documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="termsUrl">Terms of Service URL</Label>
                  <Input
                    id="termsUrl"
                    value={legal.termsOfServiceUrl}
                    onChange={(e) => setLegal({ ...legal, termsOfServiceUrl: e.target.value })}
                    placeholder="https://example.com/terms"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="privacyUrl">Privacy Policy URL</Label>
                  <Input
                    id="privacyUrl"
                    value={legal.privacyPolicyUrl}
                    onChange={(e) => setLegal({ ...legal, privacyPolicyUrl: e.target.value })}
                    placeholder="https://example.com/privacy"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cookieUrl">Cookie Policy URL</Label>
                <Input
                  id="cookieUrl"
                  value={legal.cookiePolicyUrl}
                  onChange={(e) => setLegal({ ...legal, cookiePolicyUrl: e.target.value })}
                  placeholder="https://example.com/cookies"
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="customTerms">Custom Terms of Service (Optional)</Label>
                <Textarea
                  id="customTerms"
                  value={legal.customTermsOfService}
                  onChange={(e) => setLegal({ ...legal, customTermsOfService: e.target.value })}
                  placeholder="Enter your custom terms of service here..."
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  If provided, this will be displayed instead of linking to an external URL
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customPrivacy">Custom Privacy Policy (Optional)</Label>
                <Textarea
                  id="customPrivacy"
                  value={legal.customPrivacyPolicy}
                  onChange={(e) => setLegal({ ...legal, customPrivacyPolicy: e.target.value })}
                  placeholder="Enter your custom privacy policy here..."
                  rows={6}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveLegal} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Legal Documents
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Support Tab */}
        <TabsContent value="support" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Support Configuration</CardTitle>
              <CardDescription>
                Set up support channels for your team members
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supportEmail">Support Email</Label>
                  <div className="flex gap-2">
                    <Mail className="h-4 w-4 mt-3 text-muted-foreground" />
                    <Input
                      id="supportEmail"
                      type="email"
                      value={support.email}
                      onChange={(e) => setSupport({ ...support, email: e.target.value })}
                      placeholder="support@example.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supportPhone">Support Phone</Label>
                  <div className="flex gap-2">
                    <Phone className="h-4 w-4 mt-3 text-muted-foreground" />
                    <Input
                      id="supportPhone"
                      value={support.phone}
                      onChange={(e) => setSupport({ ...support, phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Company Website</Label>
                  <div className="flex gap-2">
                    <Globe className="h-4 w-4 mt-3 text-muted-foreground" />
                    <Input
                      id="websiteUrl"
                      value={support.websiteUrl}
                      onChange={(e) => setSupport({ ...support, websiteUrl: e.target.value })}
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="docsUrl">Documentation URL</Label>
                  <div className="flex gap-2">
                    <ExternalLink className="h-4 w-4 mt-3 text-muted-foreground" />
                    <Input
                      id="docsUrl"
                      value={support.documentationUrl}
                      onChange={(e) => setSupport({ ...support, documentationUrl: e.target.value })}
                      placeholder="https://docs.example.com"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Live Chat</Label>
                  <p className="text-sm text-muted-foreground">
                    Show a chat widget for real-time support
                  </p>
                </div>
                <Switch
                  checked={support.chatEnabled}
                  onCheckedChange={(checked) => setSupport({ ...support, chatEnabled: checked })}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveSupport} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Support Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subscription & Billing</CardTitle>
              <CardDescription>
                Manage your subscription plan and billing information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg border bg-muted/50">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold capitalize">
                      {organization.subscription.plan} Plan
                    </h3>
                    <p className="text-sm text-muted-foreground capitalize">
                      Status: {organization.subscription.status}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {organization.subscription.status}
                  </Badge>
                </div>

                <Separator className="my-4" />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Max Users</p>
                    <p className="font-medium">
                      {organization.limits.maxUsers === -1 ? 'Unlimited' : organization.limits.maxUsers}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Max Tasks</p>
                    <p className="font-medium">
                      {organization.limits.maxTasks === -1 ? 'Unlimited' : organization.limits.maxTasks}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  Change Plan
                </Button>
                <Button variant="outline" className="flex-1">
                  View Invoices
                </Button>
                <Button variant="outline" className="flex-1">
                  Update Payment
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default OrganizationSettingsPage;
