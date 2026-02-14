"use client";

import { ContractForm } from "../../components/ContractForm";
import type { ContractType } from "@/types/contract";

type EditContractClientProps = {
  contractId: string;
  contractType: ContractType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultValues: any;
  defaultVehicleId: string;
};

export function EditContractClient({
  contractId,
  contractType,
  defaultValues,
  defaultVehicleId,
}: EditContractClientProps) {
  return (
    <ContractForm
      contractType={contractType}
      mode="edit"
      contractId={contractId}
      defaultValues={defaultValues}
      defaultVehicleId={defaultVehicleId}
    />
  );
}
