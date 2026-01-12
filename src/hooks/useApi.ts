import { useState, useEffect, useCallback, useRef } from "react";
import { ApiError, ApiResponse } from "../api";

interface UseApiState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

interface UseApiOptions {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export function useApi<T, P extends any[] = []>(
  apiFn: (...args: P) => Promise<ApiResponse<T>>,
  options: UseApiOptions = {}
) {
  const { immediate = false, onSuccess, onError } = options;
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    isLoading: immediate,
    error: null,
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args: P): Promise<T | null> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await apiFn(...args);

        if (!mountedRef.current) return null;

        if (response.success && response.data !== undefined) {
          setState({ data: response.data, isLoading: false, error: null });
          onSuccess?.(response.data);
          return response.data;
        } else {
          const errorMsg = response.message || "An error occurred";
          setState({ data: null, isLoading: false, error: errorMsg });
          onError?.(errorMsg);
          return null;
        }
      } catch (err) {
        if (!mountedRef.current) return null;

        const errorMsg =
          err instanceof ApiError ? err.message : "An error occurred";
        setState({ data: null, isLoading: false, error: errorMsg });
        onError?.(errorMsg);
        return null;
      }
    },
    [apiFn, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setState({ data: null, isLoading: false, error: null });
  }, []);

  const setData = useCallback((data: T | null) => {
    setState((prev) => ({ ...prev, data }));
  }, []);

  return {
    ...state,
    execute,
    reset,
    setData,
  };
}

// Hook for paginated data
interface UsePaginatedApiOptions<T> extends UseApiOptions {
  initialPage?: number;
  initialLimit?: number;
  transform?: (data: T[]) => T[];
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function usePaginatedApi<T, F extends Record<string, any> = {}>(
  apiFn: (
    filters: F & { page: number; limit: number }
  ) => Promise<ApiResponse<T[]>>,
  options: UsePaginatedApiOptions<T> = {}
) {
  const {
    initialPage = 1,
    initialLimit = 20,
    transform,
    ...apiOptions
  } = options;

  const [items, setItems] = useState<T[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    page: initialPage,
    limit: initialLimit,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<F>({} as F);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(
    async (newFilters?: Partial<F>, newPage?: number) => {
      const currentFilters = newFilters
        ? { ...filters, ...newFilters }
        : filters;
      const currentPage = newPage ?? pagination.page;

      setIsLoading(true);
      setError(null);

      try {
        const response = await apiFn({
          ...currentFilters,
          page: currentPage,
          limit: pagination.limit,
        } as F & { page: number; limit: number });

        if (!mountedRef.current) return;

        if (response.success && response.data) {
          const transformedData = transform
            ? transform(response.data)
            : response.data;
          setItems(transformedData);
          if (response.pagination) {
            setPagination(response.pagination);
          }
          if (newFilters) {
            setFilters(currentFilters as F);
          }
          apiOptions.onSuccess?.(transformedData);
        } else {
          setError(response.message || "Failed to fetch data");
          apiOptions.onError?.(response.message || "Failed to fetch data");
        }
      } catch (err) {
        if (!mountedRef.current) return;
        const errorMsg =
          err instanceof ApiError ? err.message : "An error occurred";
        setError(errorMsg);
        apiOptions.onError?.(errorMsg);
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [apiFn, filters, pagination.page, pagination.limit, transform, apiOptions]
  );

  const goToPage = useCallback(
    (page: number) => {
      setPagination((prev) => ({ ...prev, page }));
      fetchData(undefined, page);
    },
    [fetchData]
  );

  const updateFilters = useCallback(
    (newFilters: Partial<F>) => {
      setPagination((prev) => ({ ...prev, page: 1 }));
      fetchData(newFilters, 1);
    },
    [fetchData]
  );

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const updateItem = useCallback((id: string, updates: Partial<T>) => {
    setItems((prev) =>
      prev.map((item) =>
        (item as any).id === id ? { ...item, ...updates } : item
      )
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => (item as any).id !== id));
    setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
  }, []);

  const addItem = useCallback((item: T) => {
    setItems((prev) => [item, ...prev]);
    setPagination((prev) => ({ ...prev, total: prev.total + 1 }));
  }, []);

  return {
    items,
    pagination,
    isLoading,
    error,
    filters,
    fetchData,
    goToPage,
    updateFilters,
    refresh,
    updateItem,
    removeItem,
    addItem,
    setItems,
  };
}

// Hook for mutations (create, update, delete)
export function useMutation<T, P extends any[] = []>(
  mutationFn: (...args: P) => Promise<ApiResponse<T>>,
  options: UseApiOptions = {}
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (
      ...args: P
    ): Promise<{ success: boolean; data?: T; error?: string }> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await mutationFn(...args);

        if (response.success) {
          options.onSuccess?.(response.data);
          return { success: true, data: response.data };
        } else {
          const errorMsg = response.message || "Operation failed";
          setError(errorMsg);
          options.onError?.(errorMsg);
          return { success: false, error: errorMsg };
        }
      } catch (err) {
        const errorMsg =
          err instanceof ApiError ? err.message : "An error occurred";
        setError(errorMsg);
        options.onError?.(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    [mutationFn, options]
  );

  const reset = useCallback(() => {
    setError(null);
  }, []);

  return {
    mutate,
    isLoading,
    error,
    reset,
  };
}

export default useApi;
