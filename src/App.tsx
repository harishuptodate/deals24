
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { Loader2 } from "lucide-react";
import EnhancedErrorBoundary from "./components/enhanced/EnhancedErrorBoundary";

// Lazy load components for code splitting
const Index = lazy(() => import("./pages/Index").catch(err => {
  console.error('Failed to load Index page:', err);
  return { default: () => <div>Error loading page. Please refresh.</div> };
}));

const Deals = lazy(() => import("./pages/Deals").catch(err => {
  console.error('Failed to load Deals page:', err);
  return { default: () => <div>Error loading page. Please refresh.</div> };
}));

const Categories = lazy(() => import("./pages/Categories").catch(err => {
  console.error('Failed to load Categories page:', err);
  return { default: () => <div>Error loading page. Please refresh.</div> };
}));

const Admin = lazy(() => import("./pages/Admin").catch(err => {
  console.error('Failed to load Admin page:', err);
  return { default: () => <div>Error loading page. Please refresh.</div> };
}));

const Wishlist = lazy(() => import("./pages/Wishlist").catch(err => {
  console.error('Failed to load Wishlist page:', err);
  return { default: () => <div>Error loading page. Please refresh.</div> };
}));

const NotFound = lazy(() => import("./pages/NotFound").catch(err => {
  console.error('Failed to load NotFound page:', err);
  return { default: () => <div>Page not found</div> };
}));

const Deal = lazy(() => import("./pages/Deal").catch(err => {
  console.error('Failed to load Deal page:', err);
  return { default: () => <div>Error loading page. Please refresh.</div> };
}));

// Enhanced loading fallback component
const LoadingFallback = () => (
  <div className="flex justify-center items-center min-h-screen bg-white dark:bg-[#09090B]">
    <div className="text-center">
      <Loader2 className="w-8 h-8 animate-spin text-apple-gray dark:text-gray-400 mx-auto mb-4" />
      <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
    </div>
  </div>
);

// Create a client with enhanced production settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) return false;
        return failureCount < 3;
      },
      refetchOnWindowFocus: import.meta.env.PROD,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Verify environment variables are loaded
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
console.log("API Base URL configured:", apiBaseUrl || "Not set");

const App = () => {
  useEffect(() => {
    // Initialize theme based on localStorage or system preference
    const savedTheme = localStorage.getItem('theme');
    const root = window.document.documentElement;
    
    // Remove any existing theme classes
    root.classList.remove('light', 'dark');
    
    if (savedTheme) {
      if (savedTheme === 'system') {
        // Apply system preference
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
        root.classList.add(systemTheme);
      } else {
        // Apply saved theme
        root.classList.add(savedTheme);
      }
    } else {
      // Default to system preference if no saved preference
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
      localStorage.setItem('theme', 'system'); // Save system as default
    }

    // Performance monitoring
    if (import.meta.env.DEV) {
      console.log("Running in development mode");
      console.log("API Base URL:", import.meta.env.VITE_API_BASE_URL);
    }

    // Add module loading error handler
    window.addEventListener('error', (event) => {
      if (event.message.includes('Failed to fetch dynamically imported module')) {
        console.error('Module loading error detected:', event);
        // Show user-friendly error message
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
          <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                      background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                      z-index: 10000; text-align: center; font-family: system-ui;">
            <h3>Loading Error</h3>
            <p>There was an issue loading the page. Please refresh to continue.</p>
            <button onclick="window.location.reload()" 
                    style="background: #007bff; color: white; border: none; padding: 8px 16px; 
                           border-radius: 4px; cursor: pointer; margin-top: 10px;">
              Refresh Page
            </button>
          </div>
        `;
        document.body.appendChild(errorDiv);
      }
    });

    // Add shimmer animation keyframes
    const style = document.createElement('style');
    style.textContent = `
      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <EnhancedErrorBoundary>
          <BrowserRouter>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/deals" element={<Deals />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="/deal/:id" element={<Deal />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </EnhancedErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
