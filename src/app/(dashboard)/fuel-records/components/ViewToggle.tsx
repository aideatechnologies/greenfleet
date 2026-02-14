"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { List, TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ViewToggleProps = {
  currentView: string;
};

export function ViewToggle({ currentView }: ViewToggleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setView = useCallback(
    (view: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (view === "feed") {
        params.delete("view");
      } else {
        params.set("view", view);
      }
      // Reset page when switching views
      params.delete("page");
      router.push(`/fuel-records?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex items-center rounded-md border">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "rounded-r-none border-r px-3",
          currentView === "feed" && "bg-muted"
        )}
        onClick={() => setView("feed")}
      >
        <List className="mr-1.5 h-4 w-4" />
        Feed
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "rounded-l-none px-3",
          currentView === "table" && "bg-muted"
        )}
        onClick={() => setView("table")}
      >
        <TableIcon className="mr-1.5 h-4 w-4" />
        Tabella
      </Button>
    </div>
  );
}
