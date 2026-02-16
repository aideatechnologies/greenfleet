import { Prisma } from "@/generated/prisma/client";
import { numberifyBigInts } from "@/lib/utils/bigint";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Prisma extension that automatically converts all BigInt values to Number
 * in query results. Safe for auto-increment IDs that never exceed MAX_SAFE_INTEGER.
 */
export function bigintToNumberExtension() {
  return Prisma.defineExtension({
    name: "bigint-to-number",
    query: {
      $allModels: {
        async $allOperations({ args, query }: any) {
          const result = await query(args);
          return numberifyBigInts(result);
        },
      },
    },
  });
}
