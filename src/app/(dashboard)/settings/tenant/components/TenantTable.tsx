"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal, Pencil, Ban, RotateCcw, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import { deactivateTenant } from "../actions/deactivate-tenant";
import { reactivateTenant } from "../actions/reactivate-tenant";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: Date;
  _count: { members: number };
};

export function TenantTable({ tenants }: { tenants: Tenant[] }) {
  const router = useRouter();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    tenantId: string;
    tenantName: string;
    action: "deactivate" | "reactivate";
  }>({ open: false, tenantId: "", tenantName: "", action: "deactivate" });
  const [isLoading, setIsLoading] = useState(false);

  async function handleToggleStatus() {
    setIsLoading(true);
    try {
      if (confirmDialog.action === "deactivate") {
        const formData = new FormData();
        formData.set("id", confirmDialog.tenantId);
        const result = await deactivateTenant(formData);
        if (result.success) {
          toast.success("Società disattivata");
        } else {
          toast.error(result.error);
        }
      } else {
        const result = await reactivateTenant(confirmDialog.tenantId);
        if (result.success) {
          toast.success("Società riattivata");
        } else {
          toast.error(result.error);
        }
      }
      router.refresh();
    } catch {
      toast.error("Errore nell'operazione");
    } finally {
      setIsLoading(false);
      setConfirmDialog({ ...confirmDialog, open: false });
    }
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Stato</TableHead>
            <TableHead>Membri</TableHead>
            <TableHead>Data creazione</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tenants.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Nessuna società presente
              </TableCell>
            </TableRow>
          )}
          {tenants.map((tenant) => (
            <TableRow key={tenant.id}>
              <TableCell className="font-medium">{tenant.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {tenant.slug}
              </TableCell>
              <TableCell>
                <Badge variant={tenant.isActive ? "default" : "secondary"}>
                  {tenant.isActive ? "Attiva" : "Disattivata"}
                </Badge>
              </TableCell>
              <TableCell>{tenant._count.members}</TableCell>
              <TableCell>
                {new Date(tenant.createdAt).toLocaleDateString("it-IT")}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() =>
                        router.push(
                          `/settings/tenant/${tenant.id}/edit`
                        )
                      }
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Modifica
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        router.push(
                          `/settings/tenant/${tenant.id}/features`
                        )
                      }
                    >
                      <ToggleRight className="mr-2 h-4 w-4" />
                      Feature
                    </DropdownMenuItem>
                    {tenant.isActive ? (
                      <DropdownMenuItem
                        onClick={() =>
                          setConfirmDialog({
                            open: true,
                            tenantId: tenant.id,
                            tenantName: tenant.name,
                            action: "deactivate",
                          })
                        }
                        className="text-destructive"
                      >
                        <Ban className="mr-2 h-4 w-4" />
                        Disattiva
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() =>
                          setConfirmDialog({
                            open: true,
                            tenantId: tenant.id,
                            tenantName: tenant.name,
                            action: "reactivate",
                          })
                        }
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Riattiva
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog({ ...confirmDialog, open })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === "deactivate"
                ? "Disattiva società"
                : "Riattiva società"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === "deactivate"
                ? `Stai per disattivare "${confirmDialog.tenantName}". Gli utenti di questa società non potranno più accedere alla piattaforma. Potrai riattivare la società in qualsiasi momento.`
                : `Stai per riattivare "${confirmDialog.tenantName}". Gli utenti della società potranno nuovamente accedere alla piattaforma.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleStatus} disabled={isLoading}>
              {isLoading
                ? "Operazione in corso..."
                : confirmDialog.action === "deactivate"
                  ? "Disattiva"
                  : "Riattiva"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
