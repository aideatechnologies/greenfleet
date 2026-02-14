import { requireAuth } from "@/lib/auth/permissions";
import { redirect, notFound } from "next/navigation";
import { getCatalogVehicleById } from "@/lib/services/catalog-service";
import { CatalogVehicleDetail } from "../components/CatalogVehicleDetail";

type CatalogVehicleDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CatalogVehicleDetailPage({
  params,
}: CatalogVehicleDetailPageProps) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    redirect("/login");
  }

  const { id } = await params;
  const vehicle = await getCatalogVehicleById(id);

  if (!vehicle) {
    notFound();
  }

  return <CatalogVehicleDetail vehicle={vehicle} />;
}
