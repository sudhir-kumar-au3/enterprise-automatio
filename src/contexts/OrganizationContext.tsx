/**
 * Organization Context
 * Manages multi-tenant organization state, branding, and settings
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { apiClient } from '@/api/client';

// Types
export interface OrganizationBranding {
  logo?: string;
  logoLight?: string;
  favicon?: string;
  primaryColor: string;
  accentColor: string;
  companyName: string;
  tagline?: string;
}

export interface OrganizationLegal {
  termsOfServiceUrl?: string;
  privacyPolicyUrl?: string;
  customTermsOfService?: string;
  customPrivacyPolicy?: string;
  cookiePolicyUrl?: string;
}

export interface OrganizationSupport {
  email?: string;
  phone?: string;
  websiteUrl?: string;
  documentationUrl?: string;
  chatEnabled?: boolean;
}

export interface OrganizationSubscription {
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'suspended';
  trialEndsAt?: string;
  currentPeriodEnd?: string;
}

export interface OrganizationLimits {
  maxUsers: number;
  maxTasks: number;
  maxStorage: number;
  maxApiCalls: number;
  features: string[];
}

export interface OrganizationSettings {
  defaultTimezone: string;
  defaultLanguage: string;
  dateFormat: string;
  allowPublicSignup: boolean;
  ssoEnabled: boolean;
  ssoProvider?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  branding: OrganizationBranding;
  legal: OrganizationLegal;
  support: OrganizationSupport;
  subscription: OrganizationSubscription;
  limits: OrganizationLimits;
  settings: OrganizationSettings;
}

export interface UsageStats {
  users: { current: number; limit: number; percentage: number };
  tasks: { current: number; limit: number; percentage: number };
  plan: string;
  features: string[];
}

interface OrganizationContextType {
  organization: Organization | null;
  isLoading: boolean;
  error: string | null;
  usageStats: UsageStats | null;
  
  // Actions
  fetchOrganization: () => Promise<void>;
  updateBranding: (branding: Partial<OrganizationBranding>) => Promise<void>;
  updateLegal: (legal: Partial<OrganizationLegal>) => Promise<void>;
  updateSettings: (settings: Partial<OrganizationSettings>) => Promise<void>;
  fetchUsageStats: () => Promise<void>;
  
  // Feature checks
  hasFeature: (feature: string) => boolean;
  isWithinLimit: (limitType: 'users' | 'tasks', currentCount: number) => boolean;
  
  // Branding helpers
  getBrandedStyles: () => React.CSSProperties;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

// Default branding for when no organization is loaded
const DEFAULT_BRANDING: OrganizationBranding = {
  primaryColor: '#3b82f6',
  accentColor: '#8b5cf6',
  companyName: 'Pulsework',
};

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);

  // Fetch organization on mount
  const fetchOrganization = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiClient.get<Organization>('/organizations/current');
      if (response.success && response.data) {
        setOrganization(response.data as Organization);
        applyBranding((response.data as Organization).branding);
      }
    } catch (err: any) {
      // Not an error if user isn't logged in yet
      if (err.status !== 401) {
        setError(err.message || 'Failed to load organization');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch organization public info by slug (for login pages)
  const fetchPublicOrganization = useCallback(async (slug: string) => {
    try {
      const response = await apiClient.get<{ branding: OrganizationBranding }>(`/organizations/public/${slug}`);
      if (response.success && response.data) {
        const data = response.data as { branding: OrganizationBranding };
        // Only apply branding, don't set full org
        applyBranding(data.branding);
        return data;
      }
    } catch (err) {
      console.error('Failed to fetch public organization:', err);
    }
    return null;
  }, []);

  // Update branding
  const updateBranding = useCallback(async (branding: Partial<OrganizationBranding>) => {
    try {
      const response = await apiClient.patch<{ branding: OrganizationBranding }>('/organizations/current/branding', branding);
      if (response.success && response.data) {
        const data = response.data as { branding: OrganizationBranding };
        setOrganization(prev => prev ? {
          ...prev,
          branding: { ...prev.branding, ...data.branding }
        } : null);
        const mergedBranding: OrganizationBranding = {
          ...DEFAULT_BRANDING,
          ...organization?.branding,
          ...branding,
        };
        applyBranding(mergedBranding);
      }
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update branding');
    }
  }, [organization]);

  // Update legal documents
  const updateLegal = useCallback(async (legal: Partial<OrganizationLegal>) => {
    try {
      const response = await apiClient.patch<{ legal: OrganizationLegal }>('/organizations/current/legal', legal);
      if (response.success && response.data) {
        const data = response.data as { legal: OrganizationLegal };
        setOrganization(prev => prev ? {
          ...prev,
          legal: { ...prev.legal, ...data.legal }
        } : null);
      }
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update legal settings');
    }
  }, []);

  // Update settings
  const updateSettings = useCallback(async (settings: Partial<OrganizationSettings>) => {
    try {
      const response = await apiClient.patch<Organization>('/organizations/current', { settings });
      if (response.success && response.data) {
        setOrganization(response.data as Organization);
      }
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update settings');
    }
  }, []);

  // Fetch usage statistics
  const fetchUsageStats = useCallback(async () => {
    try {
      const response = await apiClient.get<UsageStats>('/organizations/current/usage');
      if (response.success && response.data) {
        setUsageStats(response.data as UsageStats);
      }
    } catch (err) {
      console.error('Failed to fetch usage stats:', err);
    }
  }, []);

  // Check if feature is available
  const hasFeature = useCallback((feature: string): boolean => {
    if (!organization) return false;
    return organization.limits.features.includes(feature);
  }, [organization]);

  // Check if within limits
  const isWithinLimit = useCallback((limitType: 'users' | 'tasks', currentCount: number): boolean => {
    if (!organization) return true;
    const limit = limitType === 'users' 
      ? organization.limits.maxUsers 
      : organization.limits.maxTasks;
    return limit === -1 || currentCount < limit;
  }, [organization]);

  // Get branded CSS styles
  const getBrandedStyles = useCallback((): React.CSSProperties => {
    const branding = organization?.branding || DEFAULT_BRANDING;
    return {
      '--brand-primary': branding.primaryColor,
      '--brand-accent': branding.accentColor,
    } as React.CSSProperties;
  }, [organization]);

  // Apply branding to document
  const applyBranding = (branding: OrganizationBranding) => {
    const root = document.documentElement;
    
    if (branding.primaryColor) {
      root.style.setProperty('--brand-primary', branding.primaryColor);
    }
    if (branding.accentColor) {
      root.style.setProperty('--brand-accent', branding.accentColor);
    }
    
    // Update favicon if provided
    if (branding.favicon) {
      const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (favicon) {
        favicon.href = branding.favicon;
      }
    }
    
    // Update page title with company name
    if (branding.companyName) {
      const baseTitle = document.title.split(' | ').pop() || 'Task Management';
      document.title = `${branding.companyName} | ${baseTitle}`;
    }
  };

  // Try to detect organization from URL on mount
  useEffect(() => {
    const detectOrganization = async () => {
      const hostname = window.location.hostname;
      const pathMatch = window.location.pathname.match(/^\/org\/([a-z0-9-]+)/);
      
      // Check subdomain
      const parts = hostname.split('.');
      if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'api') {
        await fetchPublicOrganization(parts[0]);
      }
      // Check path
      else if (pathMatch) {
        await fetchPublicOrganization(pathMatch[1]);
      }
    };

    detectOrganization();
  }, [fetchPublicOrganization]);

  const value: OrganizationContextType = {
    organization,
    isLoading,
    error,
    usageStats,
    fetchOrganization,
    updateBranding,
    updateLegal,
    updateSettings,
    fetchUsageStats,
    hasFeature,
    isWithinLimit,
    getBrandedStyles,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}

export default OrganizationContext;
