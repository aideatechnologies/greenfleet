"use client";

import { useCallback, useRef, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { SEARCH_DEBOUNCE_MS } from "@/lib/utils/constants";

type CatalogSearchBarProps = {
  defaultValue: string;
};

export function CatalogSearchBar({ defaultValue }: CatalogSearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;

      // Cancella il timer precedente
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Debounce: aggiorna URL dopo SEARCH_DEBOUNCE_MS
      timerRef.current = setTimeout(() => {
        startTransition(() => {
          const params = new URLSearchParams(searchParams.toString());
          if (value.trim()) {
            params.set("q", value.trim());
          } else {
            params.delete("q");
          }
          // Reset alla prima pagina per nuove ricerche
          params.set("page", "1");
          router.push(`${pathname}?${params.toString()}`);
        });
      }, SEARCH_DEBOUNCE_MS);
    },
    [router, pathname, searchParams, startTransition]
  );

  return (
    <div className="relative w-full sm:w-80">
      <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Cerca marca, modello, allestimento..."
        defaultValue={defaultValue}
        onChange={handleChange}
        className="pl-9"
        aria-label="Cerca nel catalogo veicoli"
      />
      {isPending && (
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
          <div className="size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      )}
    </div>
  );
}
