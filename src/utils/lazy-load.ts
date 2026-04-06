/**
 * Lazy Loading Utility for React Native
 * Uses a stateful wrapper pattern instead of React.lazy (not supported in RN)
 *
 * Usage:
 *   const ProfileScreen = lazyLoad(() => import('./profile'))
 *   const AIAssistant = lazyLoad(() => import('./ai-assistant'))
 */

import React, { ComponentType, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

// ── Loading Fallback Component ─────────────────────────────────────────────
interface LoadingFallbackProps {
  message?: string;
}

export const DefaultLoadingFallback = ({ message = 'Loading...' }: LoadingFallbackProps) => (
  React.createElement(
    View,
    { style: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' } },
    React.createElement(ActivityIndicator, { size: 'large', color: '#6C63FF' }),
    React.createElement(Text, { style: { marginTop: 16, color: '#333' } }, message)
  )
);

// ── Error Boundary for Lazy Components ─────────────────────────────────────
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: (error: Error) => React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class LazyErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[LazyLoad] Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        this.props.fallback?.(this.state.error) ||
        React.createElement(
          View,
          { style: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 } },
          React.createElement(
            Text,
            { style: { fontSize: 16, color: 'red', textAlign: 'center' } },
            'Failed to load component'
          )
        )
      );
    }
    return this.props.children;
  }
}

// ── Core Lazy Load Function ────────────────────────────────────────────────
interface LazyLoadOptions {
  fallback?: React.ReactNode;
  errorFallback?: (error: Error) => React.ReactNode;
  displayName?: string;
}

/**
 * Wraps a dynamic import in a stateful component.
 * React.lazy + Suspense is NOT used because React Native's renderer
 * does not support Suspense-based code splitting reliably.
 */
export function lazyLoad<P extends object>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  options: LazyLoadOptions = {}
): ComponentType<P> {
  const displayName = options.displayName || 'LazyComponent';

  function LazyComponent(props: P) {
    const [LoadedComponent, setLoadedComponent] = useState<ComponentType<P> | null>(null);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
      let cancelled = false;
      importFunc()
        .then((mod) => {
          if (!cancelled) setLoadedComponent(() => mod.default);
        })
        .catch((err) => {
          if (!cancelled) setError(err);
          console.error('[LazyLoad] Failed to load component:', err);
        });
      return () => { cancelled = true; };
    }, []);

    if (error) {
      // Re-throw so the wrapping LazyErrorBoundary catches it
      throw error;
    }

    if (!LoadedComponent) {
      return React.createElement(
        React.Fragment,
        null,
        options.fallback ?? React.createElement(DefaultLoadingFallback)
      ) as React.ReactElement;
    }

    
  }

  LazyComponent.displayName = displayName;
  return LazyComponent;
}

// ── Preload Hook ───────────────────────────────────────────────────────────
/**
 * Returns a preload function that kicks off the import early.
 * Call it on hover / focus / nav-press before the component mounts.
 *
 * Usage:
 *   const preloadAI = usePreloadComponent(() => import('./ai-assistant'))
 *   <TouchableOpacity onPress={() => { preloadAI(); navigation.navigate('ai-assistant'); }}>
 */
export function usePreloadComponent(importFunc: () => Promise<{ default: any }>) {
  const preload = React.useCallback(() => {
    importFunc().catch((err) => {
      console.warn('[LazyLoad] Preload failed:', err);
    });
  }, [importFunc]);

  return preload;
}

// ── REMOVED: lazyLoadScreen ────────────────────────────────────────────────
// Dynamic string imports like `import(screenPath)` are NOT supported by Metro
// bundler. Metro requires import paths to be static string literals so it can
// build the dependency graph at compile time. Use lazyLoad() directly instead:
//
//   // ✅ Correct — static literal path
//   const ProfileScreen = lazyLoad(() => import('./screens/profile'), {
//     displayName: 'ProfileScreen',
//   });
//
//   // ❌ Wrong — variable path, Metro cannot resolve this
//   const ProfileScreen = lazyLoadScreen('./screens/profile');