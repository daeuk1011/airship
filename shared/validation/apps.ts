import { z } from "zod";

export const createAppSchema = z.object({
  appKey: z
    .string()
    .trim()
    .min(1, "App key is required")
    .regex(/^[a-z0-9-]+$/, "App key must contain only lowercase letters, numbers, and hyphens"),
  name: z.string().trim().min(1, "Display name is required"),
});

export type CreateAppInput = z.infer<typeof createAppSchema>;
