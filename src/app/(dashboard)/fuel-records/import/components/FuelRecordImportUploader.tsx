"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import type { FuelRecordImportConfig } from "@/lib/schemas/fuel-record-import";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls"];

type FuelRecordImportUploaderProps = {
  onFileSelected: (file: File, config: FuelRecordImportConfig) => void;
  config: FuelRecordImportConfig;
  onConfigChange: (config: FuelRecordImportConfig) => void;
};

export function FuelRecordImportUploader({
  onFileSelected,
  config,
  onConfigChange,
}: FuelRecordImportUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      return `Formato non supportato. Formati accettati: ${ACCEPTED_EXTENSIONS.join(", ")}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return "Il file supera la dimensione massima di 10MB";
    }
    return null;
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setSelectedFile(null);
        return;
      }
      setError(null);
      setSelectedFile(file);
    },
    [validateFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, []);

  const handleProceed = useCallback(() => {
    if (selectedFile) {
      onFileSelected(selectedFile, config);
    }
  }, [selectedFile, config, onFileSelected]);

  const isCSV = selectedFile?.name.toLowerCase().endsWith(".csv") ?? false;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors cursor-pointer ${
          dragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
        <p className="mb-1 text-sm font-medium">
          Trascina qui il tuo file oppure clicca per selezionarlo
        </p>
        <p className="text-xs text-muted-foreground">
          Formati supportati: CSV, XLSX, XLS (max 10MB)
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {/* Error message */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Selected file info */}
      {selectedFile && (
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <FileText className="h-8 w-8 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveFile();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* CSV configuration */}
      {selectedFile && isCSV && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Configurazione CSV</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Separatore</Label>
              <Select
                value={config.separator}
                onValueChange={(value) =>
                  onConfigChange({ ...config, separator: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=";">Punto e virgola (;)</SelectItem>
                  <SelectItem value=",">Virgola (,)</SelectItem>
                  <SelectItem value={"\t"}>Tabulazione</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Codifica</Label>
              <Select
                value={config.encoding}
                onValueChange={(value) =>
                  onConfigChange({
                    ...config,
                    encoding: value as FuelRecordImportConfig["encoding"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTF-8">UTF-8</SelectItem>
                  <SelectItem value="ISO-8859-1">Latin-1 (ISO-8859-1)</SelectItem>
                  <SelectItem value="Windows-1252">Windows-1252</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Formato numeri</Label>
              <Select
                value={config.numberFormat}
                onValueChange={(value) =>
                  onConfigChange({
                    ...config,
                    numberFormat: value as "IT" | "EN",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IT">Italiano (1.234,56)</SelectItem>
                  <SelectItem value="EN">Inglese (1,234.56)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch
                id="hasHeader"
                checked={config.hasHeader}
                onCheckedChange={(checked) =>
                  onConfigChange({ ...config, hasHeader: checked })
                }
              />
              <Label htmlFor="hasHeader">
                Prima riga = intestazioni
              </Label>
            </div>
          </div>
        </div>
      )}

      {/* Number format for Excel too */}
      {selectedFile && !isCSV && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Configurazione</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Formato numeri</Label>
              <Select
                value={config.numberFormat}
                onValueChange={(value) =>
                  onConfigChange({
                    ...config,
                    numberFormat: value as "IT" | "EN",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IT">Italiano (1.234,56)</SelectItem>
                  <SelectItem value="EN">Inglese (1,234.56)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Proceed button */}
      {selectedFile && (
        <div className="flex justify-end">
          <Button onClick={handleProceed}>Avanti</Button>
        </div>
      )}
    </div>
  );
}
