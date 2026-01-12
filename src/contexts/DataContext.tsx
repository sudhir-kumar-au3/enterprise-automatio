import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { dataService, DashboardStatistics, ActivityItem, Backup } from '../api';
import { useAuth } from './AuthContext';

interface DataContextType {
  statistics: DashboardStatistics | null;
  activities: ActivityItem[];
  backups: Backup[];
  isLoadingStats: boolean;
  isLoadingActivities: boolean;
  isLoadingBackups: boolean;
  error: string | null;
  fetchStatistics: () => Promise<void>;
  fetchActivities: (params?: { page?: number; limit?: number }) => Promise<void>;
  fetchBackups: () => Promise<void>;
  createBackup: () => Promise<boolean>;
  restoreBackup: (id: string) => Promise<boolean>;
  deleteBackup: (id: string) => Promise<boolean>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [statistics, setStatistics] = useState<DashboardStatistics | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatistics = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingStats(true);
    try {
      const response = await dataService.getStatistics();
      if (response.success && response.data) {
        setStatistics(response.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingStats(false);
    }
  }, [isAuthenticated]);

  const fetchActivities = useCallback(async (params?: { page?: number; limit?: number }) => {
    if (!isAuthenticated) return;
    setIsLoadingActivities(true);
    try {
      const response = await dataService.getActivityTimeline(params);
      if (response.success && response.data) {
        setActivities(response.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingActivities(false);
    }
  }, [isAuthenticated]);

  const fetchBackups = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingBackups(true);
    try {
      const response = await dataService.getBackups();
      if (response.success && response.data) {
        setBackups(response.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingBackups(false);
    }
  }, [isAuthenticated]);

  const createBackup = useCallback(async (): Promise<boolean> => {
    try {
      const response = await dataService.createBackup();
      if (response.success && response.data) {
        setBackups(prev => [response.data!, ...prev]);
        return true;
      }
      return false;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, []);

  const restoreBackup = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await dataService.restoreBackup(id);
      return response.success;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, []);

  const deleteBackup = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await dataService.deleteBackup(id);
      if (response.success) {
        setBackups(prev => prev.filter(b => b.id !== id));
        return true;
      }
      return false;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, []);

  // Fetch initial data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchStatistics();
      fetchActivities({ limit: 20 });
    }
  }, [isAuthenticated, fetchStatistics, fetchActivities]);

  const value: DataContextType = {
    statistics,
    activities,
    backups,
    isLoadingStats,
    isLoadingActivities,
    isLoadingBackups,
    error,
    fetchStatistics,
    fetchActivities,
    fetchBackups,
    createBackup,
    restoreBackup,
    deleteBackup,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextType {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}

export default DataContext;
