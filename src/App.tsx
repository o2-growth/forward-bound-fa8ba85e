import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ThemeProvider } from "@/components/ThemeProvider";
import Planning2026 from "./pages/Planning2026";
import Auth from "./pages/Auth";
import DebugReuniao from "./pages/DebugReuniao";
import DebugCliente from "./pages/DebugCliente";
import ComercialPreview from "./pages/ComercialPreview";
import DebugOrigens from "./pages/DebugOrigens";
import DebugFunnelMetas from "./pages/DebugFunnelMetas";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Planning2026 />
                </ProtectedRoute>
              }
            />
            <Route
              path="/debug-reuniao/:cardId"
              element={
                <ProtectedRoute>
                  <DebugReuniao />
                </ProtectedRoute>
              }
            />
            <Route
              path="/debug-cliente/:titulo"
              element={
                <ProtectedRoute>
                  <DebugCliente />
                </ProtectedRoute>
              }
            />
            <Route
              path="/comercial-preview"
              element={
                <ProtectedRoute>
                  <ComercialPreview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/debug-origens"
              element={
                <ProtectedRoute>
                  <DebugOrigens />
                </ProtectedRoute>
              }
            />
            <Route
              path="/debug-funnel-metas"
              element={
                <ProtectedRoute>
                  <DebugFunnelMetas />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
