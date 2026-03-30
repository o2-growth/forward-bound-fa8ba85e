import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BUKey, months } from "@/components/planning/salesData";

export interface SalesRealized {
  id: string;
  bu: BUKey;
  month: string;
  year: number;
  value: number;
  created_at: string;
  updated_at: string;
}

export interface SalesRealizedByBU {
  [bu: string]: {
    [month: string]: number;
  };
}

export function useSalesRealized(year: number = 2026) {
  const queryClient = useQueryClient();

  const { data: salesData, isLoading, error } = useQuery({
    queryKey: ["sales-realized", year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_realized")
        .select("*")
        .eq("year", year)
        .order("bu")
        .order("month");

      if (error) throw error;
      return data as SalesRealized[];
    },
  });

  // Transform data into a structured format
  const realizedByBU: SalesRealizedByBU = {
    modelo_atual: {},
    o2_tax: {},
    oxy_hacker: {},
    franquia: {},
  };

  if (salesData) {
    salesData.forEach((sale) => {
      if (!realizedByBU[sale.bu]) {
        realizedByBU[sale.bu] = {};
      }
      realizedByBU[sale.bu][sale.month] = Number(sale.value);
    });
  }

  // Initialize missing months with 0
  Object.keys(realizedByBU).forEach((bu) => {
    months.forEach((month) => {
      if (realizedByBU[bu][month] === undefined) {
        realizedByBU[bu][month] = 0;
      }
    });
  });

  // Calculate totals
  const calculateBURealized = (buKey: BUKey): number => {
    return months.reduce((sum, month) => sum + (realizedByBU[buKey]?.[month] || 0), 0);
  };

  const totalRealized = Object.keys(realizedByBU).reduce(
    (sum, bu) => sum + calculateBURealized(bu as BUKey),
    0
  );

  // Mutation to update sales
  const updateSale = useMutation({
    mutationFn: async ({
      bu,
      month,
      value,
    }: {
      bu: BUKey;
      month: string;
      value: number;
    }) => {
      const { data, error } = await supabase
        .from("sales_realized")
        .upsert(
          { bu, month, year, value },
          { onConflict: "bu,month,year" }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-realized", year] });
    },
  });

  return {
    salesData,
    realizedByBU,
    calculateBURealized,
    totalRealized,
    isLoading,
    error,
    updateSale,
  };
}
