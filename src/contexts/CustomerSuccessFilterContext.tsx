import React, { createContext, useContext, useState, useCallback } from 'react';

export interface CustomerSuccessFilters {
  cfos: string[];
  produtos: string[];
  period: 'all' | 'q1' | 'q2' | 'q3' | 'q4';
  year: string;
  dateRange?: { from?: Date; to?: Date };
}

interface CustomerSuccessFilterContextType {
  filters: CustomerSuccessFilters;
  setFilters: (filters: Partial<CustomerSuccessFilters>) => void;
  clearFilters: () => void;
}

const defaultFilters: CustomerSuccessFilters = {
  cfos: [],
  produtos: [],
  period: 'all',
  year: 'all',
  dateRange: undefined,
};

const CustomerSuccessFilterContext = createContext<CustomerSuccessFilterContextType | undefined>(undefined);

export function CustomerSuccessFilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFiltersState] = useState<CustomerSuccessFilters>(defaultFilters);

  const setFilters = useCallback((partial: Partial<CustomerSuccessFilters>) => {
    setFiltersState(prev => ({ ...prev, ...partial }));
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState(defaultFilters);
  }, []);

  return (
    <CustomerSuccessFilterContext.Provider value={{ filters, setFilters, clearFilters }}>
      {children}
    </CustomerSuccessFilterContext.Provider>
  );
}

export function useCustomerSuccessFilters() {
  const context = useContext(CustomerSuccessFilterContext);
  if (!context) {
    throw new Error('useCustomerSuccessFilters must be used within a CustomerSuccessFilterProvider');
  }
  return context;
}
