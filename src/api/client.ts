/**
 * Enhanced API Client with Retry Logic, Circuit Breaker, and Offline Support
 * Enterprise-grade HTTP client for resilient API communication
 */

import config from "./config";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Array<{ field: string; message: string }>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public errors?: Array<{ field: string; message: string }>,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Circuit breaker states
type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  halfOpenRequests: number;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryableStatuses: number[];
}

class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failures = 0;
  private lastFailureTime = 0;
  private halfOpenSuccesses = 0;

  constructor(private config: CircuitBreakerConfig) {}

  canRequest(): boolean {
    if (this.state === "CLOSED") return true;

    if (this.state === "OPEN") {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.config.resetTimeout) {
        this.state = "HALF_OPEN";
        this.halfOpenSuccesses = 0;
        return true;
      }
      return false;
    }

    // HALF_OPEN: allow limited requests
    return true;
  }

  recordSuccess(): void {
    if (this.state === "HALF_OPEN") {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.config.halfOpenRequests) {
        this.state = "CLOSED";
        this.failures = 0;
      }
    } else {
      this.failures = 0;
    }
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === "HALF_OPEN") {
      this.state = "OPEN";
    } else if (this.failures >= this.config.failureThreshold) {
      this.state = "OPEN";
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

// Offline request queue
interface QueuedRequest {
  id: string;
  endpoint: string;
  options: RequestInit;
  timestamp: number;
  retries: number;
}

class OfflineQueue {
  private queue: QueuedRequest[] = [];
  private readonly storageKey = "offline_request_queue";

  constructor() {
    this.loadFromStorage();
    this.setupOnlineListener();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch {
      this.queue = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
    } catch {
      // Storage full or unavailable
    }
  }

  private setupOnlineListener(): void {
    window.addEventListener("online", () => {
      this.processQueue();
    });
  }

  enqueue(endpoint: string, options: RequestInit): string {
    const id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.queue.push({
      id,
      endpoint,
      options,
      timestamp: Date.now(),
      retries: 0,
    });
    this.saveToStorage();
    return id;
  }

  async processQueue(): Promise<void> {
    if (!navigator.onLine || this.queue.length === 0) return;

    const requests = [...this.queue];
    this.queue = [];
    this.saveToStorage();

    for (const request of requests) {
      try {
        await fetch(request.endpoint, request.options);
      } catch {
        if (request.retries < 3) {
          request.retries++;
          this.queue.push(request);
        }
      }
    }

    this.saveToStorage();
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}

class ApiClient {
  private baseUrl: string;
  private circuitBreaker: CircuitBreaker;
  private offlineQueue: OfflineQueue;
  private retryConfig: RetryConfig;

  constructor() {
    this.baseUrl = config.apiBaseUrl;

    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 30000, // 30 seconds
      halfOpenRequests: 2,
    });

    this.offlineQueue = new OfflineQueue();

    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      retryableStatuses: [408, 429, 500, 502, 503, 504],
    };
  }

  private getToken(): string | null {
    return localStorage.getItem(config.tokenKey);
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem(config.refreshTokenKey);
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(config.tokenKey, accessToken);
    localStorage.setItem(config.refreshTokenKey, refreshToken);
  }

  private clearTokens(): void {
    localStorage.removeItem(config.tokenKey);
    localStorage.removeItem(config.refreshTokenKey);
    localStorage.removeItem(config.userKey);
  }

  private async refreshAccessToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        this.clearTokens();
        return false;
      }

      const data = await response.json();
      if (data.success && data.data) {
        this.setTokens(data.data.accessToken, data.data.refreshToken);
        return true;
      }
      return false;
    } catch {
      this.clearTokens();
      return false;
    }
  }

  private calculateBackoff(attempt: number): number {
    const delay = Math.min(
      this.retryConfig.baseDelay * Math.pow(2, attempt),
      this.retryConfig.maxDelay
    );
    // Add jitter (±25%)
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    return Math.round(delay + jitter);
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isRetryable(status: number): boolean {
    return this.retryConfig.retryableStatuses.includes(status);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<ApiResponse<T>> {
    // Check circuit breaker
    if (!this.circuitBreaker.canRequest()) {
      throw new ApiError(
        503,
        "Service temporarily unavailable. Please try again later.",
        undefined,
        true
      );
    }

    // Check if offline
    if (!navigator.onLine) {
      // Queue write operations for later
      if (
        options.method &&
        ["POST", "PUT", "PATCH", "DELETE"].includes(options.method)
      ) {
        const queueId = this.offlineQueue.enqueue(
          `${this.baseUrl}${endpoint}`,
          options
        );
        throw new ApiError(
          0,
          "You are offline. Request queued for later.",
          undefined,
          false
        );
      }
      throw new ApiError(0, "You are offline. Please check your connection.");
    }

    const token = this.getToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "X-Request-ID": `${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    const url = `${this.baseUrl}${endpoint}`;
    const startTime = performance.now();

    try {
      const response = await fetch(url, { ...options, headers });
      const latency = performance.now() - startTime;

      // Log slow requests
      if (latency > 2000) {
        console.warn(
          `Slow API request: ${endpoint} took ${latency.toFixed(0)}ms`
        );
      }

      // Handle 401 - try to refresh token
      const isAuthEndpoint =
        endpoint.startsWith("/auth/login") ||
        endpoint.startsWith("/auth/register");

      if (response.status === 401 && !isAuthEndpoint && retryCount === 0) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          return this.request<T>(endpoint, options, retryCount + 1);
        }
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
        throw new ApiError(401, "Session expired. Please login again.");
      }

      const data = await response.json();

      if (!response.ok) {
        // Check if retryable
        if (
          this.isRetryable(response.status) &&
          retryCount < this.retryConfig.maxRetries
        ) {
          const delay = this.calculateBackoff(retryCount);
          await this.sleep(delay);
          return this.request<T>(endpoint, options, retryCount + 1);
        }

        this.circuitBreaker.recordFailure();
        throw new ApiError(
          response.status,
          data.message || data.error || "An error occurred",
          data.errors,
          this.isRetryable(response.status)
        );
      }

      this.circuitBreaker.recordSuccess();
      return data as ApiResponse<T>;
    } catch (error) {
      if (error instanceof ApiError) throw error;

      // Network error - retry if possible
      if (retryCount < this.retryConfig.maxRetries) {
        const delay = this.calculateBackoff(retryCount);
        await this.sleep(delay);
        return this.request<T>(endpoint, options, retryCount + 1);
      }

      this.circuitBreaker.recordFailure();
      throw new ApiError(
        0,
        "Network error. Please check your connection.",
        undefined,
        true
      );
    }
  }

  // Public methods
  async get<T>(
    endpoint: string,
    params?: Record<string, any>
  ): Promise<ApiResponse<T>> {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach((v) => searchParams.append(key, String(v)));
          } else {
            searchParams.append(key, String(value));
          }
        }
      });
      const queryString = searchParams.toString();
      if (queryString) url += `?${queryString}`;
    }
    return this.request<T>(url, { method: "GET" });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }

  // Auth helpers
  setAuthTokens(accessToken: string, refreshToken: string): void {
    this.setTokens(accessToken, refreshToken);
  }

  clearAuth(): void {
    this.clearTokens();
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Status helpers
  getCircuitState(): CircuitState {
    return this.circuitBreaker.getState();
  }

  getOfflineQueueLength(): number {
    return this.offlineQueue.getQueueLength();
  }

  isOnline(): boolean {
    return navigator.onLine;
  }
}

// Singleton instance
export const apiClient = new ApiClient();
export default apiClient;
