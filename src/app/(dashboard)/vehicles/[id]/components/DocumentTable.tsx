"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import {
  Shield,
  Wrench,
  Receipt,
  FileText,
  File,
  Download,
  Pencil,
  Trash2,
  Plus,
  AlertTriangle,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/data-display/StatusBadge";
import type { StatusBadgeVariant } from "@/components/data-display/StatusBadge";
import {
  DocumentType,
  DOCUMENT_TYPE_LABELS,
} from "@/types/document";
import type { DocumentType as DocumentTypeType } from "@/types/document";
import { formatFileSize } from "@/lib/utils/format-file-size";
import { getExpiryStatus } from "@/lib/services/vehicle-document-service";
import type { DocumentSummary } from "@/lib/services/vehicle-document-service";
import { deleteDocumentAction } from "../actions/delete-document";
import { DocumentForm } from "./DocumentForm";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SerializedDocument = {
  id: string;
  tenantId: string;
  vehicleId: string;
  documentType: string;
  description: string | null;
  expiryDate: string;
  fileName: string;
  fileUrl: string;
  fileMimeType: string;
  fileSize: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

type DocumentTableProps = {
  documents: SerializedDocument[];
  summary: DocumentSummary;
  vehicleId: string;
  canEdit: boolean;
};

// ---------------------------------------------------------------------------
// Icon map per document type
// ---------------------------------------------------------------------------

function getDocumentTypeIcon(type: string) {
  switch (type) {
    case DocumentType.ASSICURAZIONE:
      return <Shield className="h-4 w-4 text-blue-600" />;
    case DocumentType.REVISIONE:
      return <Wrench className="h-4 w-4 text-amber-600" />;
    case DocumentType.BOLLO:
      return <Receipt className="h-4 w-4 text-green-600" />;
    case DocumentType.CARTA_CIRCOLAZIONE:
      return <FileText className="h-4 w-4 text-purple-600" />;
    case DocumentType.ALTRO:
    default:
      return <File className="h-4 w-4 text-gray-600" />;
  }
}

// ---------------------------------------------------------------------------
// Expiry status badge mapping
// ---------------------------------------------------------------------------

function getExpiryBadge(expiryDate: string): {
  label: string;
  variant: StatusBadgeVariant;
} {
  const status = getExpiryStatus(new Date(expiryDate));
  switch (status) {
    case "expired":
      return { label: "Scaduto", variant: "destructive" };
    case "warning":
      return { label: "In scadenza", variant: "warning" };
    case "ok":
      return { label: "Valido", variant: "success" };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DocumentTable({
  documents,
  summary,
  vehicleId,
  canEdit,
}: DocumentTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<SerializedDocument | null>(null);

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteDocumentAction(id, vehicleId);
      if (result.success) {
        toast.success("Documento eliminato");
        router.refresh();
      } else {
        toast.error(result.error);
      }
      setDeleteId(null);
    });
  }

  function handleEdit(doc: SerializedDocument) {
    setEditingDoc(doc);
    setFormOpen(true);
  }

  function handleCreate() {
    setEditingDoc(null);
    setFormOpen(true);
  }

  function handleFormClose() {
    setFormOpen(false);
    setEditingDoc(null);
  }

  const warningCount = summary.expired + summary.expiring;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle>Documenti ({summary.total})</CardTitle>
              {warningCount > 0 && (
                <StatusBadge
                  label={`${warningCount} ${warningCount === 1 ? "attenzione" : "attenzioni"}`}
                  variant={summary.expired > 0 ? "destructive" : "warning"}
                />
              )}
            </div>
            {canEdit && (
              <Button size="sm" variant="outline" onClick={handleCreate}>
                <Plus className="mr-1 h-4 w-4" />
                Aggiungi documento
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="mb-4 h-12 w-12 text-muted-foreground/40" />
              <p className="text-lg font-medium text-muted-foreground">
                Nessun documento
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Aggiungi assicurazione, revisione e altri documenti del veicolo.
              </p>
              {canEdit && (
                <Button
                  size="sm"
                  className="mt-4"
                  onClick={handleCreate}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Aggiungi documento
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrizione</TableHead>
                  <TableHead>Scadenza</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Dimensione</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => {
                  const expiryBadge = getExpiryBadge(doc.expiryDate);
                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getDocumentTypeIcon(doc.documentType)}
                          <span className="font-medium">
                            {DOCUMENT_TYPE_LABELS[
                              doc.documentType as DocumentTypeType
                            ] ?? doc.documentType}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {doc.description || "-"}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {format(new Date(doc.expiryDate), "dd MMM yyyy", {
                          locale: it,
                        })}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          label={expiryBadge.label}
                          variant={expiryBadge.variant}
                        />
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {formatFileSize(doc.fileSize)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              ...
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <a
                                href={`/api/documents/${doc.id}/download`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Scarica
                              </a>
                            </DropdownMenuItem>
                            {canEdit && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleEdit(doc)}
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Modifica
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleteId(doc.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Elimina
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Eliminare il documento?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Il documento e il file associato verranno eliminati
              permanentemente. Questa azione non puo essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              {isPending ? "Eliminazione..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create/Edit form dialog */}
      <DocumentForm
        open={formOpen}
        onClose={handleFormClose}
        vehicleId={vehicleId}
        editingDocument={editingDoc}
      />
    </>
  );
}
