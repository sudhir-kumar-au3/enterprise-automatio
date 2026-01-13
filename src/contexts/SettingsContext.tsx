import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// Settings storage key
const SETTINGS_KEY = 'teamhub_user_settings';

// Types
export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  desktop: boolean;
  email: boolean;
  taskAssigned: boolean;
  taskCompleted: boolean;
  mentions: boolean;
  deadlineReminders: boolean;
  deadlineReminderDays: number;
  weeklyDigest: boolean;
}

export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  accentColor: 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'teal';
  compactMode: boolean;
  animations: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

export interface ProductivitySettings {
  defaultTaskView: 'list' | 'board' | 'calendar';
  autoSave: boolean;
  autoSaveInterval: number;
  showCompletedTasks: boolean;
  defaultPriority: 'low' | 'medium' | 'high';
  aiSuggestions: boolean;
}

export interface PrivacySettings {
  showOnlineStatus: boolean;
  showActivityStatus: boolean;
  allowMentions: boolean;
  profileVisibility: 'public' | 'team' | 'private';
}

export interface UserSettings {
  notifications: NotificationSettings;
  appearance: AppearanceSettings;
  productivity: ProductivitySettings;
  privacy: PrivacySettings;
}

// Default settings
export const defaultSettings: UserSettings = {
  notifications: {
    enabled: true,
    sound: true,
    desktop: false,
    email: false,
    taskAssigned: true,
    taskCompleted: true,
    mentions: true,
    deadlineReminders: true,
    deadlineReminderDays: 1,
    weeklyDigest: false,
  },
  appearance: {
    theme: 'system',
    accentColor: 'blue',
    compactMode: false,
    animations: true,
    fontSize: 'medium',
  },
  productivity: {
    defaultTaskView: 'board',
    autoSave: true,
    autoSaveInterval: 30,
    showCompletedTasks: true,
    defaultPriority: 'medium',
    aiSuggestions: true,
  },
  privacy: {
    showOnlineStatus: true,
    showActivityStatus: true,
    allowMentions: true,
    profileVisibility: 'team',
  },
};

// Accent color CSS variables mapping - more comprehensive
const accentColorVars: Record<string, { 
  primary: string; 
  primaryForeground: string;
  ring: string;
}> = {
  blue: { 
    primary: '217 91% 60%', 
    primaryForeground: '210 40% 98%',
    ring: '217 91% 60%'
  },
  purple: { 
    primary: '262 83% 58%', 
    primaryForeground: '210 40% 98%',
    ring: '262 83% 58%'
  },
  green: { 
    primary: '142 71% 45%', 
    primaryForeground: '355 100% 97%',
    ring: '142 71% 45%'
  },
  orange: { 
    primary: '25 95% 53%', 
    primaryForeground: '60 9% 98%',
    ring: '25 95% 53%'
  },
  pink: { 
    primary: '330 81% 60%', 
    primaryForeground: '355 100% 97%',
    ring: '330 81% 60%'
  },
  teal: { 
    primary: '173 80% 40%', 
    primaryForeground: '60 9% 98%',
    ring: '173 80% 40%'
  },
};

// Font size CSS mapping
const fontSizeClasses: Record<string, string> = {
  small: 'text-sm',
  medium: 'text-base',
  large: 'text-lg',
};

// Context type
interface SettingsContextType {
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  updateNotifications: (key: keyof NotificationSettings, value: any) => void;
  updateAppearance: (key: keyof AppearanceSettings, value: any) => void;
  updateProductivity: (key: keyof ProductivitySettings, value: any) => void;
  updatePrivacy: (key: keyof PrivacySettings, value: any) => void;
  resetSettings: () => void;
  saveSettings: () => Promise<void>;
  isSaving: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Apply theme to document
const applyTheme = (theme: 'light' | 'dark' | 'system') => {
  const root = document.documentElement;
  
  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  }
};

// Apply accent color to document
const applyAccentColor = (color: string) => {
  const root = document.documentElement;
  const vars = accentColorVars[color] || accentColorVars.blue;
  
  root.style.setProperty('--primary', vars.primary);
  root.style.setProperty('--primary-foreground', vars.primaryForeground);
  root.style.setProperty('--ring', vars.ring);
  root.style.setProperty('--sidebar-primary', vars.primary);
  root.style.setProperty('--sidebar-ring', vars.ring);
  root.style.setProperty('--accent-color-name', color);
};

// Apply font size to document
const applyFontSize = (size: 'small' | 'medium' | 'large') => {
  const root = document.documentElement;
  root.classList.remove('text-sm', 'text-base', 'text-lg');
  
  if (size === 'small') {
    root.style.fontSize = '14px';
  } else if (size === 'large') {
    root.style.fontSize = '18px';
  } else {
    root.style.fontSize = '16px';
  }
};

// Apply compact mode
const applyCompactMode = (enabled: boolean) => {
  const root = document.documentElement;
  if (enabled) {
    root.classList.add('compact-mode');
    root.style.setProperty('--spacing-scale', '0.85');
  } else {
    root.classList.remove('compact-mode');
    root.style.removeProperty('--spacing-scale');
  }
};

// Apply animations setting
const applyAnimations = (enabled: boolean) => {
  const root = document.documentElement;
  if (!enabled) {
    root.classList.add('reduce-motion');
    root.style.setProperty('--animation-duration', '0s');
  } else {
    root.classList.remove('reduce-motion');
    root.style.removeProperty('--animation-duration');
  }
};

// Apply all appearance settings
const applyAllAppearanceSettings = (appearance: AppearanceSettings) => {
  applyTheme(appearance.theme);
  applyAccentColor(appearance.accentColor);
  applyFontSize(appearance.fontSize);
  applyCompactMode(appearance.compactMode);
  applyAnimations(appearance.animations);
};

// Helper to load settings from localStorage
const loadSettingsFromStorage = (): UserSettings => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        notifications: { ...defaultSettings.notifications, ...parsed.notifications },
        appearance: { ...defaultSettings.appearance, ...parsed.appearance },
        productivity: { ...defaultSettings.productivity, ...parsed.productivity },
        privacy: { ...defaultSettings.privacy, ...parsed.privacy },
      };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return defaultSettings;
};

// Helper to save settings to localStorage
const saveSettingsToStorage = (settings: UserSettings): void => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
};

// IMPORTANT: Apply theme immediately on script load to prevent flash
// This runs before React renders
const initializeTheme = () => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const theme = parsed.appearance?.theme || 'system';
      const accentColor = parsed.appearance?.accentColor || 'blue';
      
      // Apply theme immediately
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', prefersDark);
      }
      
      // Apply accent color
      const vars = accentColorVars[accentColor] || accentColorVars.blue;
      document.documentElement.style.setProperty('--primary', vars.primary);
      document.documentElement.style.setProperty('--primary-foreground', vars.primaryForeground);
      document.documentElement.style.setProperty('--ring', vars.ring);
    }
  } catch (e) {
    // Ignore errors during initialization
  }
};

// Run immediately
initializeTheme();

// Provider component
export function SettingsProvider({ children }: { children: ReactNode }) {
  // Load settings and apply them immediately during initialization
  const [settings, setSettings] = useState<UserSettings>(() => {
    const loaded = loadSettingsFromStorage();
    // Apply settings synchronously during state initialization
    applyAllAppearanceSettings(loaded.appearance);
    return loaded;
  });
  const [isSaving, setIsSaving] = useState(false);

  // Re-apply settings when appearance changes
  useEffect(() => {
    applyAllAppearanceSettings(settings.appearance);
  }, [settings.appearance]);

  // Listen for system theme changes
  useEffect(() => {
    if (settings.appearance.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [settings.appearance.theme]);

  // Update entire settings object
  const updateSettings = useCallback((newSettings: Partial<UserSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      return updated;
    });
  }, []);

  // Update notification settings
  const updateNotifications = useCallback((key: keyof NotificationSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value }
    }));
  }, []);

  // Update appearance settings
  const updateAppearance = useCallback((key: keyof AppearanceSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      appearance: { ...prev.appearance, [key]: value }
    }));
  }, []);

  // Update productivity settings
  const updateProductivity = useCallback((key: keyof ProductivitySettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      productivity: { ...prev.productivity, [key]: value }
    }));
  }, []);

  // Update privacy settings
  const updatePrivacy = useCallback((key: keyof PrivacySettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      privacy: { ...prev.privacy, [key]: value }
    }));
  }, []);

  // Reset to defaults
  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
    saveSettingsToStorage(defaultSettings);
    applyAllAppearanceSettings(defaultSettings.appearance);
  }, []);

  // Save settings
  const saveSettings = useCallback(async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300)); // Small delay for UX
      saveSettingsToStorage(settings);
      applyAllAppearanceSettings(settings.appearance);
      
      // Request notification permission if desktop notifications enabled
      if (settings.notifications.desktop && 'Notification' in window) {
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [settings]);

  return (
    <SettingsContext.Provider value={{
      settings,
      updateSettings,
      updateNotifications,
      updateAppearance,
      updateProductivity,
      updatePrivacy,
      resetSettings,
      saveSettings,
      isSaving,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

// Hook to use settings
export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

export default SettingsContext;
