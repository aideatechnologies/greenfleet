import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DOCUMENT_TYPE_LABELS, type DocumentType } from "@/types/document";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DocumentItem {
  id: string;
  documentType: string;
  description: string | null;
  expiryDate: Date;
  fileName: string;
}

interface DocumentStatusListProps {
  documents: DocumentItem[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type DocStatus = "ok" | "warning" | "expired";

function getDocStatus(expiryDate: Date, now: Date): { status: DocStatus; label: string } {
  const expiry = new Date(expiryDate);
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: "expired", label: "Scaduto" };
  }
  if (diffDays <= 60) {
    return { status: "warning", label: `Scade tra ${diffDays} gg` };
  }
  return { status: "ok", label: "OK" };
}

function sortDocuments(documents: DocumentItem[], now: Date): DocumentItem[] {
  return [...documents].sort((a, b) => {
    const statusA = getDocStatus(a.expiryDate, now);
    const statusB = getDocStatus(b.expiryDate, now);

    // Expired first, then warning, then ok
    const priority: Record<DocStatus, number> = { expired: 0, warning: 1, ok: 2 };
    const pA = priority[statusA.status];
    const pB = priority[statusB.status];

    if (pA !== pB) return pA - pB;

    // Within the same status, nearest expiry first
    return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
  });
}

const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const STATUS_BADGE_CONFIG: Record<DocStatus, { variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
  ok: {
    variant: "outline",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400",
  },
  warning: {
    variant: "outline",
    className: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-400",
  },
  expired: {
    variant: "destructive",
    className: "",
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DocumentStatusList({ documents }: DocumentStatusListProps) {
  const now = new Date();
  const sorted = sortDocuments(documents, now);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Documenti veicolo
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nessun documento registrato per questo veicolo
          </p>
        ) : (
          <div className="space-y-3">
            {sorted.map((doc) => {
              const { status, label } = getDocStatus(doc.expiryDate, now);
              const badgeConfig = STATUS_BADGE_CONFIG[status];
              const typeLabel =
                DOCUMENT_TYPE_LABELS[doc.documentType as DocumentType] ?? doc.documentType;

              return (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{typeLabel}</p>
                    {doc.description && (
                      <p className="truncate text-xs text-muted-foreground">
                        {doc.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Scadenza: {dateFormatter.format(new Date(doc.expiryDate))}
                    </p>
                  </div>
                  <Badge
                    variant={badgeConfig.variant}
                    className={badgeConfig.className}
                  >
                    {label}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
