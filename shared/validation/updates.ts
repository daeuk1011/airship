import { z } from "zod";

const nonEmpty = z.string().trim().min(1);

export const promoteUpdateSchema = z.object({
  fromChannel: nonEmpty,
  toChannel: nonEmpty,
  rolloutPercent: z.number().min(0).max(100).optional(),
});

export const rollbackUpdateSchema = z.object({
  channelName: nonEmpty,
  reason: nonEmpty.optional(),
});

export type PromoteUpdateInput = z.infer<typeof promoteUpdateSchema>;
export type RollbackUpdateInput = z.infer<typeof rollbackUpdateSchema>;
