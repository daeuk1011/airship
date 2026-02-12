import { z } from "zod";

export const loginSchema = z.object({
  password: z.string().trim().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
