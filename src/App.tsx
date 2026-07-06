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
import DebugOutbound from "./pages/DebugOutbound";
import DebugG4LivesCheck from "./pages/DebugG4LivesCheck";
import NotFound from "./pages/NotFound";

// Defaults agressivos pra evitar refetch desnecessário ao trocar de aba do
// navegador / reconectar / desmontar componentes. Cada hook ainda pode
// sobrescrever via `staleTime` próprio (analytics hooks usam 30min).
// - gcTime 1h: cache permanece em memória 1h após o último componente
//   desmontar (em vez do default 5min que era apagado rápido).
// - staleTime 30min: dados considerados "frescos" por 30min.
// - refetchOnWindowFocus false: Alt+Tab voltando não dispara refetch.
// - refetchOnReconnect false: reconectar à internet não dispara refetch.
// - retry 1: só tenta de novo 1 vez em caso de erro (default 3 é lento).
//
// Botão "Atualizar" no dashboard continua funcionando pra forçar refetch.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

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
            <Route
              path="/debug-outbound"
              element={
                <ProtectedRoute>
                  <DebugOutbound />
                </ProtectedRoute>
              }
            />
            <Route
              path="/debug/g4-lives-check"
              element={
                <ProtectedRoute>
                  <DebugG4LivesCheck />
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
