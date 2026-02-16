"use client";

import { Fragment, useCallback, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Upload,
  ChevronRight,
  ChevronDown,
  X,
  Plus,
  Trash2,
  FileText,
  Play,
  Save,
  ArrowLeft,
  ArrowRight,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type {
  TemplateConfig,
  ExtractionResult,
  XmlTreeNode,
  FieldExtractionRule,
  LineFilter,
  ExtractionMethod,
} from "@/types/xml-template";
import type { XmlTemplateWithSupplier } from "@/lib/services/xml-template-service";

import {
  saveXmlTemplateAction,
  updateXmlTemplateAction,
  testExtractionAction,
  parseXmlTreeAction,
  autoDetectSupplierAction,
} from "../actions/template-actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type XmlTemplateEditorProps = {
  supplierId: number;
  supplierName: string;
  templates: XmlTemplateWithSupplier[];
};

type TargetFieldKey =
  | "licensePlate"
  | "date"
  | "fuelType"
  | "quantity"
  | "amount"
  | "cardNumber"
  | "odometerKm"
  | "description"
  | "unitPrice";

const TARGET_FIELDS: { key: TargetFieldKey; label: string }[] = [
  { key: "licensePlate", label: "Targa" },
  { key: "date", label: "Data" },
  { key: "fuelType", label: "Tipo carburante" },
  { key: "quantity", label: "Quantita" },
  { key: "amount", label: "Importo" },
  { key: "cardNumber", label: "Numero carta" },
  { key: "odometerKm", label: "Chilometraggio" },
  { key: "description", label: "Descrizione" },
  { key: "unitPrice", label: "Prezzo unitario" },
];

const STEP_LABELS = [
  "Carica XML",
  "Configura campi",
  "Filtri",
  "Test",
  "Salva",
];

function emptyTemplateConfig(): TemplateConfig {
  return {
    version: 1,
    lineXpath: "",
    fields: {},
    lineFilters: [],
  };
}

// ---------------------------------------------------------------------------
// Sub-component: XmlTreeViewer
// ---------------------------------------------------------------------------

function XmlTreeNodeItem({
  node,
  depth,
  onSelect,
  selectedPath,
}: {
  node: XmlTreeNode;
  depth: number;
  onSelect: (path: string, node: XmlTreeNode) => void;
  selectedPath: string | null;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedPath === node.path;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 py-0.5 px-1 rounded text-sm hover:bg-muted/80 cursor-pointer group",
          isSelected && "bg-primary/10 text-primary"
        )}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex-shrink-0 p-0.5"
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-[18px] flex-shrink-0" />
        )}

        <button
          onClick={() => onSelect(node.path, node)}
          className="flex items-center gap-1.5 min-w-0 flex-1 text-left"
        >
          <span className="font-mono text-xs truncate">{node.name}</span>
          {node.count && node.count > 1 && (
            <Badge variant="secondary" className="text-[10px] px-1 py-0">
              x{node.count}
            </Badge>
          )}
          {node.text && (
            <span className="text-muted-foreground text-xs truncate max-w-[200px]">
              = &quot;{node.text}&quot;
            </span>
          )}
        </button>

        <button
          onClick={() => onSelect(node.path, node)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-primary hover:underline flex-shrink-0"
        >
          Mappa
        </button>
      </div>

      {expanded &&
        hasChildren &&
        node.children!.map((child, i) => (
          <XmlTreeNodeItem
            key={`${child.path}-${i}`}
            node={child}
            depth={depth + 1}
            onSelect={onSelect}
            selectedPath={selectedPath}
          />
        ))}
    </div>
  );
}

function XmlTreeViewer({
  tree,
  onSelect,
  selectedPath,
}: {
  tree: XmlTreeNode[];
  onSelect: (path: string, node: XmlTreeNode) => void;
  selectedPath: string | null;
}) {
  if (tree.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Nessuna struttura XML caricata.
      </p>
    );
  }

  return (
    <div className="border rounded-lg p-2 max-h-[500px] overflow-y-auto bg-muted/20">
      {tree.map((node, i) => (
        <XmlTreeNodeItem
          key={`${node.path}-${i}`}
          node={node}
          depth={0}
          onSelect={onSelect}
          selectedPath={selectedPath}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function XmlTemplateEditor({
  supplierId,
  supplierName,
  templates,
}: XmlTemplateEditorProps) {
  // ---- State ----
  const [activeTemplateId, setActiveTemplateId] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const [maxReachedStep, setMaxReachedStep] = useState(0);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [sampleXml, setSampleXml] = useState("");
  const [xmlTree, setXmlTree] = useState<XmlTreeNode[]>([]);
  const [templateConfig, setTemplateConfig] = useState<TemplateConfig>(
    emptyTemplateConfig()
  );
  const [extractionResult, setExtractionResult] =
    useState<ExtractionResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  // For field mapping: which field is waiting for a node selection
  const [mappingField, setMappingField] = useState<TargetFieldKey | null>(null);
  const [selectedNodePath, setSelectedNodePath] = useState<string | null>(null);

  // ---- Derived ----
  const configuredFieldCount = useMemo(() => {
    return Object.values(templateConfig.fields).filter(Boolean).length;
  }, [templateConfig.fields]);

  const canAdvance = useMemo(() => {
    switch (step) {
      case 0:
        return sampleXml.length > 0 && templateName.trim().length > 0;
      case 1:
        return configuredFieldCount > 0 && templateConfig.lineXpath.length > 0;
      case 2:
        return true; // Filters are optional
      case 3:
        return true; // Test is optional but recommended
      default:
        return false;
    }
  }, [step, sampleXml, templateName, configuredFieldCount, templateConfig.lineXpath]);

  // ---- Helpers ----

  const goToStep = useCallback(
    (nextStep: number) => {
      setStep(nextStep);
      setMaxReachedStep((prev) => Math.max(prev, nextStep));
    },
    []
  );

  const resetWizard = useCallback(() => {
    setActiveTemplateId(null);
    setStep(0);
    setMaxReachedStep(0);
    setTemplateName("");
    setTemplateDescription("");
    setSampleXml("");
    setXmlTree([]);
    setTemplateConfig(emptyTemplateConfig());
    setExtractionResult(null);
    setMappingField(null);
    setSelectedNodePath(null);
  }, []);

  const loadTemplate = useCallback(
    (template: XmlTemplateWithSupplier) => {
      setActiveTemplateId(template.id);
      setTemplateName(template.name);
      setTemplateDescription(template.description ?? "");
      setTemplateConfig(template.templateConfig);
      setSampleXml(template.sampleXml ?? "");
      setExtractionResult(null);

      if (template.sampleXml) {
        startTransition(async () => {
          const treeResult = await parseXmlTreeAction(template.sampleXml!);
          if (treeResult.success) {
            setXmlTree(treeResult.data);
          }
        });
      }

      setStep(1);
      setMaxReachedStep(4);
    },
    [startTransition]
  );

  // ---- File upload ----

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.name.endsWith(".xml")) {
        toast.error("Seleziona un file XML valido");
        return;
      }

      const reader = new FileReader();
      reader.onload = (evt) => {
        const content = evt.target?.result as string;
        if (!content) {
          toast.error("Impossibile leggere il file");
          return;
        }
        setSampleXml(content);

        startTransition(async () => {
          const [treeResult, supplierResult] = await Promise.all([
            parseXmlTreeAction(content),
            autoDetectSupplierAction(content),
          ]);

          if (treeResult.success) {
            setXmlTree(treeResult.data);
            toast.success("Struttura XML analizzata");
          } else {
            toast.error(treeResult.error);
          }

          if (supplierResult.success && supplierResult.data) {
            toast.info(
              `P.IVA fornitore rilevata: ${supplierResult.data}`
            );
          }
        });
      };
      reader.onerror = () => {
        toast.error("Errore nella lettura del file");
      };
      reader.readAsText(file);
    },
    [startTransition]
  );

  // ---- Field mapping ----

  const handleNodeSelect = useCallback(
    (path: string, _node: XmlTreeNode) => {
      setSelectedNodePath(path);

      if (mappingField) {
        // Assign the selected node path to the field that's waiting for mapping
        setTemplateConfig((prev) => ({
          ...prev,
          fields: {
            ...prev.fields,
            [mappingField]: {
              method: "XPATH" as ExtractionMethod,
              xpath: path,
            } satisfies FieldExtractionRule,
          },
        }));
        toast.success(
          `Campo "${TARGET_FIELDS.find((f) => f.key === mappingField)?.label}" mappato a "${path}"`
        );
        setMappingField(null);
      }
    },
    [mappingField]
  );

  const handleFieldClear = useCallback((key: TargetFieldKey) => {
    setTemplateConfig((prev) => {
      const newFields = { ...prev.fields };
      delete newFields[key];
      return { ...prev, fields: newFields };
    });
  }, []);

  const handleFieldUpdate = useCallback(
    (key: TargetFieldKey, rule: FieldExtractionRule) => {
      setTemplateConfig((prev) => ({
        ...prev,
        fields: {
          ...prev.fields,
          [key]: rule,
        },
      }));
    },
    []
  );

  // ---- Line filters ----

  const addFilter = useCallback(() => {
    setTemplateConfig((prev) => ({
      ...prev,
      lineFilters: [
        ...(prev.lineFilters ?? []),
        { fieldPath: "", regex: "", action: "include" as const },
      ],
    }));
  }, []);

  const removeFilter = useCallback((index: number) => {
    setTemplateConfig((prev) => ({
      ...prev,
      lineFilters: (prev.lineFilters ?? []).filter((_, i) => i !== index),
    }));
  }, []);

  const updateFilter = useCallback(
    (index: number, update: Partial<LineFilter>) => {
      setTemplateConfig((prev) => ({
        ...prev,
        lineFilters: (prev.lineFilters ?? []).map((f, i) =>
          i === index ? { ...f, ...update } : f
        ),
      }));
    },
    []
  );

  // ---- Test extraction ----

  const handleTestExtraction = useCallback(() => {
    startTransition(async () => {
      const result = await testExtractionAction({
        templateConfig,
        xmlContent: sampleXml,
      });
      if (result.success) {
        setExtractionResult(result.data);
        if (result.data.errors.length > 0) {
          toast.warning(
            `Estrazione completata con ${result.data.errors.length} errori`
          );
        } else {
          toast.success(
            `Estratte ${result.data.lines.length} righe su ${result.data.totalLines} totali`
          );
        }
      } else {
        toast.error(result.error);
      }
    });
  }, [templateConfig, sampleXml, startTransition]);

  // ---- Save ----

  const handleSave = useCallback(async () => {
    setIsSaving(true);

    try {
      if (activeTemplateId) {
        const result = await updateXmlTemplateAction(activeTemplateId, {
          name: templateName,
          description: templateDescription || undefined,
          templateConfig,
          sampleXml: sampleXml || undefined,
        });
        if (result.success) {
          toast.success("Template aggiornato con successo");
        } else {
          toast.error(result.error);
        }
      } else {
        const result = await saveXmlTemplateAction({
          supplierId,
          name: templateName,
          description: templateDescription || undefined,
          templateConfig,
          sampleXml: sampleXml || undefined,
        });
        if (result.success) {
          setActiveTemplateId(result.data.id);
          toast.success("Template salvato con successo");
        } else {
          toast.error(result.error);
        }
      }
    } catch {
      toast.error("Errore imprevisto durante il salvataggio");
    } finally {
      setIsSaving(false);
    }
  }, [
    activeTemplateId,
    templateName,
    templateDescription,
    templateConfig,
    sampleXml,
    supplierId,
  ]);

  // ---- Render Step 0: Template Selection / Upload XML ----

  function renderStep0() {
    return (
      <div className="space-y-6">
        {/* Existing templates */}
        {templates.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Template esistenti
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {templates.map((t) => (
                <Card
                  key={t.id}
                  className={cn(
                    "cursor-pointer transition-colors hover:border-primary/50",
                    activeTemplateId === t.id && "border-primary"
                  )}
                  onClick={() => loadTemplate(t)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {t.name}
                    </CardTitle>
                    {t.description && (
                      <CardDescription>{t.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Badge variant={t.isActive ? "default" : "secondary"}>
                        {t.isActive ? "Attivo" : "Disattivato"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {Object.values(t.templateConfig.fields).filter(Boolean).length} campi
                        configurati
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        loadTemplate(t);
                      }}
                    >
                      Modifica
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* New template section */}
        <Card>
          <CardHeader>
            <CardTitle>
              {templates.length > 0 ? "Nuovo template" : "Crea template"}
            </CardTitle>
            <CardDescription>
              Carica un file XML FatturaPA di esempio per {supplierName} e
              configura l&apos;estrazione dei dati.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Nome template <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="Es. FatturaPA Standard"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Descrizione</label>
                <Input
                  placeholder="Es. Template per fatture carburante"
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                />
              </div>
            </div>

            {/* File Upload Dropzone */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                File XML di esempio <span className="text-destructive">*</span>
              </label>
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  Carica file XML FatturaPA
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  Trascina o clicca per selezionare
                </span>
                <input
                  type="file"
                  accept=".xml"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
              {sampleXml && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Check className="h-4 w-4" />
                  <span>
                    File XML caricato ({(sampleXml.length / 1024).toFixed(1)} KB)
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Render Step 1: XML Tree & Field Mapping ----

  function renderStep1() {
    return (
      <div className="space-y-4">
        {/* Line XPath configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Percorso righe dettaglio</CardTitle>
            <CardDescription>
              Indica il percorso (dot-path) che identifica l&apos;array di righe
              dettaglio nel file XML. Clicca su un nodo dell&apos;albero per
              impostarlo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Es. FatturaElettronicaBody.DatiBeniServizi.DettaglioLinee"
                value={templateConfig.lineXpath}
                onChange={(e) =>
                  setTemplateConfig((prev) => ({
                    ...prev,
                    lineXpath: e.target.value,
                  }))
                }
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedNodePath) {
                    setTemplateConfig((prev) => ({
                      ...prev,
                      lineXpath: selectedNodePath,
                    }));
                    toast.success(`Percorso righe impostato: ${selectedNodePath}`);
                  } else {
                    toast.info("Seleziona prima un nodo dall'albero XML");
                  }
                }}
              >
                Usa nodo selezionato
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Left: XML Tree */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Struttura XML</CardTitle>
              <CardDescription>
                Clicca su un nodo per selezionarlo, poi assegnalo a un campo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <XmlTreeViewer
                tree={xmlTree}
                onSelect={handleNodeSelect}
                selectedPath={selectedNodePath}
              />
            </CardContent>
          </Card>

          {/* Right: Field Mapping */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mappatura campi</CardTitle>
              <CardDescription>
                {mappingField ? (
                  <>
                    Seleziona un nodo XML per il campo{" "}
                    <strong>
                      {TARGET_FIELDS.find((f) => f.key === mappingField)?.label}
                    </strong>
                    .{" "}
                    <button
                      className="text-primary underline"
                      onClick={() => setMappingField(null)}
                    >
                      Annulla
                    </button>
                  </>
                ) : (
                  "Clicca su un campo, poi seleziona il nodo XML corrispondente."
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {TARGET_FIELDS.map(({ key, label }) => {
                  const rule = templateConfig.fields[key];
                  const isActive = mappingField === key;
                  return (
                    <div
                      key={key}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border text-sm transition-colors",
                        isActive
                          ? "border-primary bg-primary/10 ring-1 ring-primary"
                          : rule
                            ? "border-primary/30 bg-primary/5"
                            : "border-border hover:border-muted-foreground/50"
                      )}
                    >
                      <button
                        className="font-medium w-32 flex-shrink-0 text-left"
                        onClick={() =>
                          setMappingField(isActive ? null : key)
                        }
                      >
                        {label}
                      </button>
                      {rule ? (
                        <>
                          <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono flex-1 truncate">
                            {rule.xpath || rule.staticValue || "—"}
                          </code>
                          <Badge variant="outline" className="text-[10px]">
                            {rule.method}
                          </Badge>
                          {rule.method === "XPATH" && (
                            <Select
                              value={rule.method}
                              onValueChange={(val) =>
                                handleFieldUpdate(key, {
                                  ...rule,
                                  method: val as ExtractionMethod,
                                })
                              }
                            >
                              <SelectTrigger className="h-6 w-20 text-[10px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="XPATH">XPATH</SelectItem>
                                <SelectItem value="REGEX">REGEX</SelectItem>
                                <SelectItem value="XPATH_REGEX">
                                  XPATH+REGEX
                                </SelectItem>
                                <SelectItem value="STATIC">STATIC</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleFieldClear(key)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <span className="text-muted-foreground text-xs flex-1">
                          {isActive
                            ? "Seleziona un nodo..."
                            : "Clicca per mappare"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Regex configuration for XPATH_REGEX fields */}
              {Object.entries(templateConfig.fields).some(
                ([, rule]) => rule && rule.method === "XPATH_REGEX"
              ) && (
                <div className="space-y-2 pt-2 border-t">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase">
                    Configurazione Regex
                  </h4>
                  {Object.entries(templateConfig.fields)
                    .filter(([, rule]) => rule && rule.method === "XPATH_REGEX")
                    .map(([key, rule]) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-xs font-medium w-24">
                          {TARGET_FIELDS.find((f) => f.key === key)?.label}
                        </span>
                        <Input
                          placeholder="Regex pattern"
                          className="h-7 text-xs font-mono"
                          value={rule?.regex ?? ""}
                          onChange={(e) =>
                            handleFieldUpdate(key as TargetFieldKey, {
                              ...rule!,
                              regex: e.target.value,
                            })
                          }
                        />
                        <Input
                          placeholder="Gruppo"
                          className="h-7 text-xs w-16"
                          type="number"
                          min={0}
                          value={rule?.regexGroup ?? 1}
                          onChange={(e) =>
                            handleFieldUpdate(key as TargetFieldKey, {
                              ...rule!,
                              regexGroup: parseInt(e.target.value) || 1,
                            })
                          }
                        />
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ---- Render Step 2: Line Filters ----

  function renderStep2() {
    const filters = templateConfig.lineFilters ?? [];

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtri righe</CardTitle>
          <CardDescription>
            Configura filtri per includere o escludere righe specifiche in base
            al contenuto dei campi estratti. I filtri sono opzionali.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {filters.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nessun filtro configurato. Le righe verranno tutte incluse.
            </p>
          )}

          {filters.map((filter, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 border rounded-lg"
            >
              <div className="flex-1 grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Campo
                  </label>
                  <Select
                    value={filter.fieldPath ?? ""}
                    onValueChange={(val) =>
                      updateFilter(index, { fieldPath: val })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Seleziona campo" />
                    </SelectTrigger>
                    <SelectContent>
                      {TARGET_FIELDS.map(({ key, label }) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom">
                        Percorso personalizzato
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {filter.fieldPath === "__custom" && (
                    <Input
                      placeholder="Dot-path personalizzato"
                      className="h-7 text-xs font-mono mt-1"
                      onChange={(e) =>
                        updateFilter(index, { fieldPath: e.target.value })
                      }
                    />
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Regex
                  </label>
                  <Input
                    placeholder="Es. ^GASOLIO"
                    className="h-8 text-xs font-mono"
                    value={filter.regex ?? ""}
                    onChange={(e) =>
                      updateFilter(index, { regex: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Azione
                  </label>
                  <Select
                    value={filter.action}
                    onValueChange={(val) =>
                      updateFilter(index, {
                        action: val as "include" | "exclude",
                      })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="include">Includi</SelectItem>
                      <SelectItem value="exclude">Escludi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                onClick={() => removeFilter(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button variant="outline" size="sm" onClick={addFilter}>
            <Plus className="h-4 w-4 mr-1" />
            Aggiungi filtro
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ---- Render Step 3: Test & Preview ----

  function renderStep3() {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Test estrazione</CardTitle>
            <CardDescription>
              Esegui il template sul file XML caricato per verificare
              l&apos;estrazione dei dati.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleTestExtraction}
              disabled={isPending || !sampleXml}
            >
              <Play className="h-4 w-4 mr-2" />
              {isPending ? "Elaborazione..." : "Esegui test"}
            </Button>

            {extractionResult && (
              <div className="space-y-3">
                {/* Summary */}
                <div className="flex items-center gap-4 text-sm">
                  <Badge
                    variant={
                      extractionResult.success ? "default" : "destructive"
                    }
                  >
                    {extractionResult.success ? "Successo" : "Errore"}
                  </Badge>
                  <span>
                    Righe totali: <strong>{extractionResult.totalLines}</strong>
                  </span>
                  <span>
                    Righe filtrate:{" "}
                    <strong>{extractionResult.filteredLines}</strong>
                  </span>
                  <span>
                    Righe estratte:{" "}
                    <strong>{extractionResult.lines.length}</strong>
                  </span>
                </div>

                {/* Invoice metadata */}
                {extractionResult.invoiceMetadata && (
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {extractionResult.invoiceMetadata.invoiceNumber && (
                      <span>
                        Fattura n.{" "}
                        {extractionResult.invoiceMetadata.invoiceNumber}
                      </span>
                    )}
                    {extractionResult.invoiceMetadata.invoiceDate && (
                      <span>
                        Data: {extractionResult.invoiceMetadata.invoiceDate}
                      </span>
                    )}
                    {extractionResult.invoiceMetadata.supplierVatNumber && (
                      <span>
                        P.IVA:{" "}
                        {extractionResult.invoiceMetadata.supplierVatNumber}
                      </span>
                    )}
                  </div>
                )}

                {/* Errors */}
                {extractionResult.errors.length > 0 && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-1">
                    <h4 className="text-sm font-medium text-destructive">
                      Errori ({extractionResult.errors.length})
                    </h4>
                    {extractionResult.errors.map((err, i) => (
                      <p key={i} className="text-xs text-destructive/80">
                        {err}
                      </p>
                    ))}
                  </div>
                )}

                {/* Results table */}
                {extractionResult.lines.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">#</TableHead>
                          <TableHead>Targa</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Carburante</TableHead>
                          <TableHead className="text-right">Qt.</TableHead>
                          <TableHead className="text-right">Importo</TableHead>
                          <TableHead>Carta</TableHead>
                          <TableHead className="text-right">Km</TableHead>
                          <TableHead>Descrizione</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {extractionResult.lines.map((line) => (
                          <TableRow key={line.lineNumber}>
                            <TableCell className="text-muted-foreground">
                              {line.lineNumber}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {line.licensePlate ?? "—"}
                            </TableCell>
                            <TableCell className="text-xs">
                              {line.date ?? "—"}
                            </TableCell>
                            <TableCell className="text-xs">
                              {line.fuelType ?? "—"}
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              {line.quantity != null
                                ? line.quantity.toFixed(2)
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              {line.amount != null
                                ? line.amount.toFixed(2)
                                : "—"}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {line.cardNumber ?? "—"}
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              {line.odometerKm ?? "—"}
                            </TableCell>
                            <TableCell className="text-xs max-w-[200px] truncate">
                              {line.description ?? "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Render Step 4: Summary & Save ----

  function renderStep4() {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riepilogo e salvataggio</CardTitle>
          <CardDescription>
            Verifica la configurazione e salva il template.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary details */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome template</label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrizione</label>
              <Input
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Config summary */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Configurazione</h4>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between py-1 border-b">
                <span className="text-muted-foreground">Fornitore</span>
                <span className="font-medium">{supplierName}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b">
                <span className="text-muted-foreground">Percorso righe</span>
                <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                  {templateConfig.lineXpath || "Non configurato"}
                </code>
              </div>
              <div className="flex items-center justify-between py-1 border-b">
                <span className="text-muted-foreground">Campi configurati</span>
                <Badge variant="secondary">{configuredFieldCount} / {TARGET_FIELDS.length}</Badge>
              </div>
              <div className="flex items-center justify-between py-1 border-b">
                <span className="text-muted-foreground">Filtri attivi</span>
                <Badge variant="secondary">
                  {templateConfig.lineFilters?.length ?? 0}
                </Badge>
              </div>
              {extractionResult && (
                <div className="flex items-center justify-between py-1 border-b">
                  <span className="text-muted-foreground">
                    Ultimo test estrazione
                  </span>
                  <Badge
                    variant={
                      extractionResult.success ? "default" : "destructive"
                    }
                  >
                    {extractionResult.lines.length} righe estratte
                  </Badge>
                </div>
              )}
            </div>

            {/* Mapped fields list */}
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-muted-foreground uppercase">
                Campi mappati
              </h4>
              {TARGET_FIELDS.map(({ key, label }) => {
                const rule = templateConfig.fields[key];
                if (!rule) return null;
                return (
                  <div
                    key={key}
                    className="flex items-center gap-2 text-xs py-1"
                  >
                    <Check className="h-3 w-3 text-green-600" />
                    <span className="w-28 font-medium">{label}</span>
                    <code className="bg-muted px-1.5 py-0.5 rounded font-mono truncate">
                      {rule.xpath || rule.staticValue || rule.method}
                    </code>
                  </div>
                );
              })}
              {configuredFieldCount === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nessun campo configurato.
                </p>
              )}
            </div>
          </div>

          {/* Save button */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={
                isSaving ||
                !templateName.trim() ||
                configuredFieldCount === 0
              }
              className="min-w-[140px]"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving
                ? "Salvataggio..."
                : activeTemplateId
                  ? "Aggiorna template"
                  : "Salva template"}
            </Button>
            {!templateName.trim() && (
              <span className="text-xs text-destructive">
                Inserisci un nome per il template
              </span>
            )}
            {configuredFieldCount === 0 && templateName.trim() && (
              <span className="text-xs text-destructive">
                Configura almeno un campo
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ---- Main render ----

  const stepRenderers = [
    renderStep0,
    renderStep1,
    renderStep2,
    renderStep3,
    renderStep4,
  ];

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {STEP_LABELS.map((label, i) => (
          <Fragment key={i}>
            {i > 0 && (
              <div
                className={cn(
                  "h-0.5 flex-1",
                  i <= step ? "bg-primary" : "bg-border"
                )}
              />
            )}
            <button
              onClick={() => i <= maxReachedStep && goToStep(i)}
              disabled={i > maxReachedStep}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground",
                i <= maxReachedStep && i !== step && "cursor-pointer hover:bg-primary/30",
                i > maxReachedStep && "cursor-not-allowed"
              )}
              title={label}
            >
              {i + 1}
            </button>
          </Fragment>
        ))}
      </div>

      {/* Step labels */}
      <div className="flex items-center gap-2 -mt-4 mb-2">
        {STEP_LABELS.map((label, i) => (
          <Fragment key={i}>
            {i > 0 && <div className="flex-1" />}
            <span
              className={cn(
                "text-xs text-center",
                i === step
                  ? "text-primary font-medium"
                  : "text-muted-foreground"
              )}
            >
              {label}
            </span>
          </Fragment>
        ))}
      </div>

      {/* Loading indicator */}
      {isPending && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent" />
          Elaborazione in corso...
        </div>
      )}

      {/* Step content */}
      {stepRenderers[step]()}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center gap-2">
          {step > 0 && (
            <Button variant="outline" onClick={() => goToStep(step - 1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Indietro
            </Button>
          )}
          {step === 0 && activeTemplateId && (
            <Button variant="ghost" onClick={resetWizard}>
              Nuovo template
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {step < 4 && (
            <Button
              onClick={() => goToStep(step + 1)}
              disabled={!canAdvance}
            >
              Avanti
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
