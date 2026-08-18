import { z } from 'zod';
export const intercambioOAuthSchema = z.object({ code: z.string().min(8).max(4096), code_verifier: z.string().min(43).max(128) }).strict();
