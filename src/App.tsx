
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { Loader2 } from "lucide-react";
import ErrorBoundary from "./components/ErrorBoundary";

// Lazy load components for code splitting
const Index = lazy(() => import("./pages/Index"));
const Deals = lazy(() => import("./pages/Deals"));
const Categories = lazy(() => import("./pages/Categories"));
const Admin = lazy(() => import("./pages/Admin"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Deal = lazy(() => import("./pages/Deal")); // Add new Deal page for individual deals

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex justify-center items-center min-h-screen">
    <Loader2 className="w-8 h-8 animate-spin text-apple-gray dark:text-gray-400" />
  </div>
);

// Create a client with production-appropriate settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 3,
      refetchOnWindowFocus: import.meta.env.PROD, // Only refetch on window focus in production
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

    // Log environment information on startup (only in development)
    if (import.meta.env.DEV) {
      console.log("Running in development mode");
      console.log("API Base URL:", import.meta.env.VITE_API_BASE_URL);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ErrorBoundary>
          <BrowserRouter>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/deals" element={<Deals />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="/deal/:id" element={<Deal />} /> {/* Add route for individual deals */}
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
