import { z } from 'zod';

// Only intentionally public contracts belong here. Case answers stay on the server.
export const healthSchema = z.object({ status: z.literal('ok'), serverTime: z.number() });
export type Health = z.infer<typeof healthSchema>;
