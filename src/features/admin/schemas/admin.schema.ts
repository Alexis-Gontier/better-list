import * as z from "zod";

import { BAN_DURATIONS } from "@/features/admin/lib/ban-duration";

export const setUsersStatusSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1).max(50),
  status: z.enum(["APPROVED", "REJECTED", "PENDING"]),
});

export const banMemberSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().trim().max(200).optional(),
  duration: z.enum(BAN_DURATIONS),
});

export const memberIdSchema = z.object({ userId: z.string().min(1) });

export const setMemberRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["admin", "user"]),
});
