
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Deals from "./pages/Deals";
import Categories from "./pages/Categories";
import Admin from "./pages/Admin";
import Wishlist from "./pages/Wishlist";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";

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
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/deals" element={<Deals />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/wishlist" element={<Wishlist />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
