// Shared zod schemas. Validation law: parse on input, no-op on
// reject — never crash a form on a bad keystroke.
import { z } from 'zod';

export const GridConfigSchema = z.object({
  tileWidth: z.number().min(8).max(1024).default(32),
  tileHeight: z.number().min(8).max(1024).default(32),
  columns: z.number().min(1).max(2048).default(16),
  rows: z.number().min(1).max(2048).default(1),
  autoSize: z.boolean().default(false).optional(),
});

export type GridConfig = z.infer<typeof GridConfigSchema>;
