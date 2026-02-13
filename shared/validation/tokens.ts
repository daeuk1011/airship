import { z } from "zod";

export const createTokenSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export type CreateTokenInput = z.infer<typeof createTokenSchema>;
