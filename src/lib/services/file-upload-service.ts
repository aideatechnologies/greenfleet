import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;
const STORAGE_BASE_DIR = path.join(process.cwd(), "storage", "documents");

// ---------------------------------------------------------------------------
// Validation result
// ---------------------------------------------------------------------------

export type FileValidationResult =
  | { valid: true }
  | { valid: false; error: string };

export function validateFile(file: File): FileValidationResult {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `Il file supera la dimensione massima di 10 MB (${formatFileSize(file.size)})`,
    };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return {
      valid: false,
      error: `Tipo file non supportato: ${file.type}. Formati accettati: PDF, JPG, PNG`,
    };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Upload file to local storage
// ---------------------------------------------------------------------------

export type UploadResult = {
  fileName: string;
  fileUrl: string;
  fileMimeType: string;
  fileSize: number;
};

export async function uploadFile(
  file: File,
  tenantId: string,
  vehicleId: string
): Promise<UploadResult> {
  // Build directory path: storage/documents/{tenantId}/{vehicleId}/
  const dirPath = path.join(STORAGE_BASE_DIR, tenantId, vehicleId);
  await fs.mkdir(dirPath, { recursive: true });

  // Generate UUID filename preserving extension
  const ext = path.extname(file.name) || getExtFromMime(file.type);
  const uuidName = `${randomUUID()}${ext}`;
  const filePath = path.join(dirPath, uuidName);

  // Write file
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  // Return relative path (from storage root) as fileUrl
  const relativeUrl = path.join(tenantId, vehicleId, uuidName);

  return {
    fileName: file.name,
    fileUrl: relativeUrl,
    fileMimeType: file.type,
    fileSize: file.size,
  };
}

// ---------------------------------------------------------------------------
// Delete file from local storage
// ---------------------------------------------------------------------------

export async function deleteFile(fileUrl: string): Promise<void> {
  const filePath = path.join(STORAGE_BASE_DIR, fileUrl);
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // Ignore if file doesn't exist (already deleted)
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

// ---------------------------------------------------------------------------
// Get absolute file path from relative URL
// ---------------------------------------------------------------------------

export function getAbsoluteFilePath(fileUrl: string): string {
  return path.join(STORAGE_BASE_DIR, fileUrl);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getExtFromMime(mimeType: string): string {
  switch (mimeType) {
    case "application/pdf":
      return ".pdf";
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    default:
      return "";
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
