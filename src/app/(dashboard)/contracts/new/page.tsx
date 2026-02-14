"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContractTypeSelector } from "../components/ContractTypeSelector";
import { ContractForm } from "../components/ContractForm";
import type { ContractType } from "@/types/contract";
import { CONTRACT_TYPE_LABELS } from "@/types/contract";

export default function NewContractPage() {
  const searchParams = useSearchParams();
  const defaultVehicleId = searchParams.get("vehicleId") ?? undefined;
  const [selectedType, setSelectedType] = useState<ContractType | null>(null);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link
          href="/contracts"
          className="hover:text-foreground transition-colors"
        >
          Contratti
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">Nuovo</span>
      </nav>

      {!selectedType ? (
        /* Step 1: Type Selection */
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Nuovo contratto
            </h2>
            <p className="text-muted-foreground">
              Seleziona il tipo di contratto che vuoi creare.
            </p>
          </div>
          <ContractTypeSelector onSelect={setSelectedType} />
        </div>
      ) : (
        /* Step 2: Contract Form */
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedType(null)}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Indietro
            </Button>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Nuovo contratto - {CONTRACT_TYPE_LABELS[selectedType]}
              </h2>
              <p className="text-muted-foreground">
                Compila i dati del contratto.
              </p>
            </div>
          </div>
          <ContractForm
            contractType={selectedType}
            defaultVehicleId={defaultVehicleId}
          />
        </div>
      )}
    </div>
  );
}
