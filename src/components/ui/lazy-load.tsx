import React, { Suspense, ComponentType, ReactNode } from 'react';
import { Skeleton, SkeletonCard } from './skeleton';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LazyLoadProps {
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
}

// Generic lazy loading wrapper with fade-in animation
export function LazyLoad({ children, fallback, className }: LazyLoadProps) {
  const defaultFallback = (
    <div className={cn("flex items-center justify-center p-8", className)}>
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      <div className="fade-in">{children}</div>
    </Suspense>
  );
}

// Skeleton-based lazy loading for cards
export function LazyLoadCard({ children, className }: LazyLoadProps) {
  return (
    <Suspense fallback={<SkeletonCard className={className} />}>
      <div className="fade-in">{children}</div>
    </Suspense>
  );
}

// Page-level lazy loading with centered spinner
export function LazyLoadPage({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
        </div>
      }
    >
      <div className="fade-in">{children}</div>
    </Suspense>
  );
}

// HOC for lazy loading components
export function withLazyLoad<P extends object>(
  Component: ComponentType<P>,
  FallbackComponent?: ComponentType
) {
  const LazyComponent = React.lazy(() => 
    Promise.resolve({ default: Component })
  );

  return function LazyWrapped(props: P) {
    const fallback = FallbackComponent ? (
      <FallbackComponent />
    ) : (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );

    return (
      <Suspense fallback={fallback}>
        <div className="fade-in">
          <LazyComponent {...props} />
        </div>
      </Suspense>
    );
  };
}

// Loading overlay for async operations
interface LoadingOverlayProps {
  isLoading: boolean;
  children: ReactNode;
  blur?: boolean;
  message?: string;
}

export function LoadingOverlay({ isLoading, children, blur = true, message }: LoadingOverlayProps) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div 
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 z-50 rounded-lg",
            blur && "backdrop-blur-sm"
          )}
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          {message && (
            <p className="text-sm text-muted-foreground">{message}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default LazyLoad;
