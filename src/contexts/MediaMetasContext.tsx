import { createContext, useContext, useState, useCallback, ReactNode } from "react";

// BU keys that match the MediaInvestmentTab BUs
export type MediaBUKey = 'modelo_atual' | 'o2_tax' | 'oxy_hacker' | 'franquia';

export interface MediaMetasState {
  modelo_atual: Record<string, number>;
  o2_tax: Record<string, number>;
  oxy_hacker: Record<string, number>;
  franquia: Record<string, number>;
}

export interface FunnelDataItem {
  month: string;
  leads: number;
  mqls: number;
  rms: number;
  rrs: number;
  propostas: number;
  vendas: number;
  investimento: number;
  faturamento?: number; // valor financeiro exato (incremento)
}

export interface FunnelDataByBU {
  modeloAtual: FunnelDataItem[];
  o2Tax: FunnelDataItem[];
  oxyHacker: FunnelDataItem[];
  franquia: FunnelDataItem[];
}

interface MediaMetasContextType {
  metasPorBU: MediaMetasState;
  setMetasPorBU: (metas: MediaMetasState) => void;
  funnelData: FunnelDataByBU | null;
  setFunnelData: (data: FunnelDataByBU) => void;
  isLoaded: boolean;
}

const defaultMetas: MediaMetasState = {
  modelo_atual: {},
  o2_tax: {},
  oxy_hacker: {},
  franquia: {},
};

const MediaMetasContext = createContext<MediaMetasContextType | undefined>(undefined);

export function MediaMetasProvider({ children }: { children: ReactNode }) {
  const [metasPorBU, setMetasPorBU] = useState<MediaMetasState>(defaultMetas);
  const [funnelData, setFunnelData] = useState<FunnelDataByBU | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleSetMetas = useCallback((metas: MediaMetasState) => {
    setMetasPorBU(metas);
    setIsLoaded(true);
  }, []);

  return (
    <MediaMetasContext.Provider value={{ 
      metasPorBU, 
      setMetasPorBU: handleSetMetas, 
      funnelData,
      setFunnelData,
      isLoaded 
    }}>
      {children}
    </MediaMetasContext.Provider>
  );
}

export function useMediaMetas() {
  const context = useContext(MediaMetasContext);
  if (context === undefined) {
    throw new Error("useMediaMetas must be used within a MediaMetasProvider");
  }
  return context;
}
