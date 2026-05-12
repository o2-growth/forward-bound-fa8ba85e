import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Context2025Tab } from "@/components/planning/Context2025Tab";
import { Goals2026Tab } from "@/components/planning/Goals2026Tab";
import { MonthlyRevenueTab } from "@/components/planning/MonthlyRevenueTab";
import { MediaInvestmentTab } from "@/components/planning/MediaInvestmentTab";
import { MarketingPlanTab } from "@/components/planning/MarketingPlanTab";
import { StructureTab } from "@/components/planning/StructureTab";

import { AdminTab } from "@/components/planning/AdminTab";
import { IndicatorsWrapper } from "@/components/planning/IndicatorsWrapper";
import { PlanGrowthDataLoader } from "@/components/planning/PlanGrowthDataLoader";
import { useAuth } from "@/hooks/useAuth";
import { useUserPermissions, TabKey } from "@/hooks/useUserPermissions";
import { MediaMetasProvider } from "@/contexts/MediaMetasContext";
import { FinancialTab } from "@/components/planning/FinancialTab";
import { JornadaTab } from "@/components/planning/JornadaTab";
import { CustomerSuccessTab } from "@/components/planning/CustomerSuccessTab";
import { Calendar, BarChart3, LineChart, Megaphone, Lightbulb, Users, Settings, LogOut, User, Loader2, EyeOff, Eye, Activity, DollarSign, Route, HeartHandshake } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { O2Logo } from "@/components/O2Logo";
import { Separator } from "@/components/ui/separator";

const TAB_CONFIG: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'context', label: 'Macro 2025', icon: BarChart3 },
  { key: 'goals', label: 'Macro 2026', icon: Calendar },
  { key: 'monthly', label: 'Meta por BU', icon: LineChart },
  
  { key: 'media', label: 'Plan Growth', icon: Megaphone },
  { key: 'indicators', label: 'Indicadores', icon: Activity },
  { key: 'cs', label: 'Customer Success', icon: HeartHandshake },
  { key: 'financial', label: 'Financeiro', icon: DollarSign },
  { key: 'marketing', label: 'Marketing', icon: Lightbulb },
  { key: 'structure', label: 'Estrutura', icon: Users },
  { key: 'admin', label: 'Admin', icon: Settings },
];

const HIDDEN_TABS: TabKey[] = ['context', 'goals', 'financial', 'marketing', 'structure'];

export default function Planning2026() {
  const { user, signOut } = useAuth();
  const { allowedTabs, isAdmin, loading } = useUserPermissions(user?.id);
  const [showHiddenTabs, setShowHiddenTabs] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Filter visible tabs based on permissions and hidden tabs toggle
  const visibleTabs = TAB_CONFIG.filter(tab => {
    const hasPermission = allowedTabs.includes(tab.key);
    const isHidden = HIDDEN_TABS.includes(tab.key);
    return hasPermission && (!isHidden || showHiddenTabs);
  });
  const defaultTab = visibleTabs[0]?.key || 'context';

  return (
    <MediaMetasProvider>
      <PlanGrowthDataLoader />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <O2Logo height={28} />
              <Separator orientation="vertical" className="h-6 bg-primary/30" />
              <span className="font-display text-sm font-medium text-muted-foreground hidden sm:inline">
                Planejamento Estratégico
              </span>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              
              {/* Hidden tabs toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHiddenTabs(!showHiddenTabs)}
                className="gap-2 text-muted-foreground"
              >
                {showHiddenTabs ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    <span className="hidden sm:inline">Ocultar abas extras</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    <span className="hidden sm:inline">Mostrar abas ocultas</span>
                  </>
                )}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {user?.user_metadata?.full_name || user?.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container py-8">
          {visibleTabs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Você não tem acesso a nenhuma aba. Contate o administrador.
              </p>
            </div>
          ) : (
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className={`grid w-full max-w-6xl mb-8`} style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}>
                {visibleTabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger key={tab.key} value={tab.key} className="gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="hidden lg:inline">{tab.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              <TabsContent value="context" className="mt-0">
                <Context2025Tab />
              </TabsContent>

              <TabsContent value="goals" className="mt-0">
                <Goals2026Tab />
              </TabsContent>

              <TabsContent value="monthly" className="mt-0">
                <MonthlyRevenueTab />
              </TabsContent>




              <TabsContent value="media" className="mt-0">
                <MediaInvestmentTab />
              </TabsContent>

              <TabsContent value="indicators" className="mt-0">
                <IndicatorsWrapper />
              </TabsContent>

              <TabsContent value="financial" className="mt-0">
                <FinancialTab />
              </TabsContent>

              <TabsContent value="cs" className="mt-0">
                <CustomerSuccessTab />
              </TabsContent>

              <TabsContent value="marketing" className="mt-0">
                <MarketingPlanTab />
              </TabsContent>

              <TabsContent value="structure" className="mt-0">
                <StructureTab />
              </TabsContent>

              {isAdmin && (
                <TabsContent value="admin" className="mt-0">
                  <AdminTab />
                </TabsContent>
              )}
            </Tabs>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-primary/10 py-6 mt-12">
          <div className="container flex items-center justify-center gap-3">
            <O2Logo height={20} />
            <Separator orientation="vertical" className="h-4 bg-primary/20" />
            <p className="text-sm text-muted-foreground">
              Planejamento Estratégico 2026
            </p>
          </div>
        </footer>
      </div>
    </MediaMetasProvider>
  );
}
