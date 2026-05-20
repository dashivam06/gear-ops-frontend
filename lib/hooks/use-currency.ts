import { useCurrencyStore } from "@/lib/store/currency-store";

export function useCurrency() {
  const { currency, setCurrency, hasHydrated } = useCurrencyStore();

  const convert = (value: number) => {
    if (currency === "NPR") {
      // Assuming DB values are in USD, convert to NPR
      return value * 130;
    }
    return value;
  };

  const formatValue = (value: number | string | undefined | null) => {
    if (value === undefined || value === null) return "0.00";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "0.00";
    return convert(num).toFixed(2);
  };

  const format = (value: number | string | undefined | null) => {
    const formatted = formatValue(value);
    const symbol = currency === "USD" ? "$" : "Rs.";
    return `${symbol}${formatted}`;
  };

  const convertToBase = (value: number) => {
    if (currency === "NPR") {
      return value / 130;
    }
    return value;
  };

  return {
    currency,
    setCurrency,
    symbol: currency === "USD" ? "$" : "Rs.",
    convert,
    convertToBase,
    formatValue,
    format,
    hasHydrated,
  };
}
