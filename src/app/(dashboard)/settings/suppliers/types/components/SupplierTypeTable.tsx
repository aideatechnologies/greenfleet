"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Save, X } from "lucide-react";
import type { SupplierType } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  createSupplierTypeAction,
  updateSupplierTypeAction,
} from "../../actions/supplier-type-actions";

type SupplierTypeTableProps = {
  types: SupplierType[];
};

export function SupplierTypeTable({ types }: SupplierTypeTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSortOrder, setEditSortOrder] = useState(0);
  const [editIsActive, setEditIsActive] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newDescription, setNewDescription] = useState("");

  function startEditing(type: SupplierType) {
    setEditingId(type.id);
    setEditLabel(type.label);
    setEditDescription(type.description ?? "");
    setEditSortOrder(type.sortOrder);
    setEditIsActive(type.isActive);
  }

  function cancelEditing() {
    setEditingId(null);
  }

  function handleSaveEdit(id: string) {
    startTransition(async () => {
      const result = await updateSupplierTypeAction(id, {
        label: editLabel,
        description: editDescription || undefined,
        sortOrder: editSortOrder,
        isActive: editIsActive,
      });
      if (result.success) {
        toast.success("Tipo aggiornato");
        setEditingId(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleCreate() {
    startTransition(async () => {
      const result = await createSupplierTypeAction({
        code: newCode,
        label: newLabel,
        description: newDescription || undefined,
        sortOrder: types.length,
      });
      if (result.success) {
        toast.success("Tipo creato");
        setCreateOpen(false);
        setNewCode("");
        setNewLabel("");
        setNewDescription("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuovo Tipo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Nuovo Tipo Fornitore</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Codice *</Label>
                <Input
                  placeholder="es. MANUTENZIONE"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Etichetta *</Label>
                <Input
                  placeholder="es. Manutenzione"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Descrizione</Label>
                <Input
                  placeholder="Descrizione opzionale"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>
              <Button onClick={handleCreate} disabled={isPending || !newCode || !newLabel} className="w-full">
                {isPending ? "Creazione..." : "Crea"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Codice</TableHead>
              <TableHead>Etichetta</TableHead>
              <TableHead>Descrizione</TableHead>
              <TableHead className="text-center">Ordine</TableHead>
              <TableHead className="text-center">Attivo</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {types.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Nessun tipo fornitore presente
                </TableCell>
              </TableRow>
            )}
            {types.map((type) => (
              <TableRow key={type.id}>
                <TableCell>
                  <Badge variant="outline" className="font-mono">
                    {type.code}
                  </Badge>
                </TableCell>
                <TableCell>
                  {editingId === type.id ? (
                    <Input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="h-8"
                    />
                  ) : (
                    <span className="font-medium">{type.label}</span>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === type.id ? (
                    <Input
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="h-8"
                    />
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {type.description || "-"}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {editingId === type.id ? (
                    <Input
                      type="number"
                      value={editSortOrder}
                      onChange={(e) => setEditSortOrder(parseInt(e.target.value) || 0)}
                      className="h-8 w-16 mx-auto text-center"
                    />
                  ) : (
                    <span className="text-sm text-muted-foreground">{type.sortOrder}</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {editingId === type.id ? (
                    <Switch checked={editIsActive} onCheckedChange={setEditIsActive} />
                  ) : (
                    <Badge variant={type.isActive ? "default" : "secondary"}>
                      {type.isActive ? "Si" : "No"}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === type.id ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSaveEdit(type.id)}
                        disabled={isPending}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={cancelEditing}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button variant="ghost" size="icon" onClick={() => startEditing(type)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
