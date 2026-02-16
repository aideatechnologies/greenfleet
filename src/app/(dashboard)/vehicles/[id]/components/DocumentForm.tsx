"use client";

import { useRef, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarIcon, Upload, X, FileText } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { DocumentType, DOCUMENT_TYPE_LABELS } from "@/types/document";
import { formatFileSize } from "@/lib/utils/format-file-size";
import { createDocumentAction } from "../actions/create-document";
import { updateDocumentAction } from "../actions/update-document";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SerializedDocument = {
  id: string;
  vehicleId: string;
  documentType: string;
  description: string | null;
  expiryDate: string;
  fileName: string;
  fileSize: number;
};

type DocumentFormProps = {
  open: boolean;
  onClose: () => void;
  vehicleId: number;
  editingDocument: SerializedDocument | null;
};

// ---------------------------------------------------------------------------
// Form schema
// ---------------------------------------------------------------------------

const formSchema = z.object({
  documentType: z.string().min(1, { error: "Seleziona un tipo di documento" }),
  description: z
    .string()
    .max(500, { error: "La descrizione non puo superare 500 caratteri" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  expiryDate: z.date({ error: "Seleziona una data di scadenza" }),
});

type FormValues = {
  documentType: string;
  description?: string;
  expiryDate: Date;
};

// ---------------------------------------------------------------------------
// Allowed mime types
// ---------------------------------------------------------------------------

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const ACCEPT_STRING = ".pdf,.jpg,.jpeg,.png";
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DocumentForm({
  open,
  onClose,
  vehicleId,
  editingDocument,
}: DocumentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = editingDocument !== null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: {
      documentType: editingDocument?.documentType ?? "",
      description: editingDocument?.description ?? "",
      expiryDate: editingDocument
        ? new Date(editingDocument.expiryDate)
        : undefined,
    },
  });

  // Reset form when dialog opens with different document
  const prevDocId = useRef<string | null>(null);
  if (open && editingDocument?.id !== prevDocId.current) {
    prevDocId.current = editingDocument?.id ?? null;
    form.reset({
      documentType: editingDocument?.documentType ?? "",
      description: editingDocument?.description ?? "",
      expiryDate: editingDocument
        ? new Date(editingDocument.expiryDate)
        : undefined,
    });
    setSelectedFile(null);
    setFileError(null);
  }

  // File validation
  function validateAndSetFile(file: File) {
    setFileError(null);
    if (!ALLOWED_TYPES.includes(file.type)) {
      setFileError("Formato non supportato. Accettati: PDF, JPG, PNG");
      return;
    }
    if (file.size > MAX_SIZE) {
      setFileError(`Il file supera i 10 MB (${formatFileSize(file.size)})`);
      return;
    }
    setSelectedFile(file);
  }

  // Drag & drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndSetFile(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
  }

  function handleSubmit(values: FormValues) {
    // File is required for creation
    if (!isEditing && !selectedFile) {
      setFileError("Il file e obbligatorio");
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();

        if (isEditing) {
          formData.append("documentId", editingDocument.id);
        } else {
          formData.append("vehicleId", String(vehicleId));
        }

        formData.append("documentType", values.documentType);
        if (values.description) {
          formData.append("description", values.description);
        }
        formData.append("expiryDate", values.expiryDate.toISOString());

        if (selectedFile) {
          formData.append("file", selectedFile);
        }

        const result = isEditing
          ? await updateDocumentAction(formData)
          : await createDocumentAction(formData);

        if (result.success) {
          toast.success(
            isEditing
              ? "Documento aggiornato"
              : "Documento caricato"
          );
          onClose();
          router.refresh();
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error("Errore imprevisto nel salvataggio");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifica documento" : "Nuovo documento"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {/* Document type */}
            <FormField
              control={form.control}
              name="documentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo documento *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona tipo..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(DocumentType).map((type) => (
                        <SelectItem key={type} value={type}>
                          {DOCUMENT_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descrizione opzionale..."
                      className="resize-none"
                      rows={3}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Expiry date */}
            <FormField
              control={form.control}
              name="expiryDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data di scadenza *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value
                            ? format(field.value, "dd MMMM yyyy", {
                                locale: it,
                              })
                            : "Seleziona data"}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => field.onChange(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* File upload area */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                File {isEditing ? "(opzionale)" : "*"}
              </label>

              {/* Existing file info for edit mode */}
              {isEditing && !selectedFile && (
                <div className="flex items-center gap-2 rounded-md border p-3 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate text-muted-foreground">
                    {editingDocument.fileName} (
                    {formatFileSize(editingDocument.fileSize)})
                  </span>
                </div>
              )}

              {/* Selected file */}
              {selectedFile && (
                <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="flex-1 truncate">
                    {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Drop zone */}
              {!selectedFile && (
                <div
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-6 transition-colors",
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-primary/50"
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mb-2 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    Trascina il file qui o{" "}
                    <span className="font-medium text-primary">sfoglia</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    PDF, JPG, PNG - max 10 MB
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_STRING}
                onChange={handleFileInputChange}
                className="hidden"
              />

              {fileError && (
                <p className="text-sm text-destructive">{fileError}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
              >
                Annulla
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? "Salvataggio..."
                  : isEditing
                    ? "Aggiorna"
                    : "Carica"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
