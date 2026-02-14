"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SEARCH_DEBOUNCE_MS } from "@/lib/utils/constants";
import { ContractType, CONTRACT_TYPE_LABELS } from "@/types/contract";
import { ExpiryStatus, EXPIRY_STATUS_LABELS } from "@/types/domain";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ContractStatusFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // Search with debounce
  const [searchValue, setSearchValue] = useState(
    searchParams.get("search") ?? ""
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateSearchParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [searchParams, pathname, router]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleSearchChange(value: string) {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateSearchParams({ search: value || null });
    }, SEARCH_DEBOUNCE_MS);
  }

  function handleTypeFilter(value: string) {
    updateSearchParams({ contractType: value === "all" ? null : value });
  }

  function handleExpiryFilter(value: string) {
    updateSearchParams({ expiryStatus: value === "all" ? null : value });
  }

  const currentTypeFilter = searchParams.get("contractType") ?? "all";
  const currentExpiryFilter = searchParams.get("expiryStatus") ?? "all";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cerca per targa, marca, modello..."
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={currentTypeFilter} onValueChange={handleTypeFilter}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Tipo contratto" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tutti i tipi</SelectItem>
          {Object.values(ContractType).map((type) => (
            <SelectItem key={type} value={type}>
              {CONTRACT_TYPE_LABELS[type]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={currentExpiryFilter} onValueChange={handleExpiryFilter}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Stato scadenza" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tutti gli stati</SelectItem>
          {Object.values(ExpiryStatus).map((status) => (
            <SelectItem key={status} value={status}>
              {EXPIRY_STATUS_LABELS[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
