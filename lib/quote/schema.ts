import { z } from "zod";
import { routing } from "@/i18n/routing";
import { configurationSchema } from "@/lib/pricing/schema";
import { countryCodes } from "./countries";

export const customerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  company: z.string().trim().max(160),
  vatNumber: z.string().trim().max(20),
  email: z.email().max(200),
  phone: z.string().trim().min(5).max(40),
  country: z.enum(countryCodes),
  address: z.string().trim().min(5).max(500),
  /** YYYY-MM-DD or empty. */
  desiredDate: z.union([z.iso.date(), z.literal("")]),
  comment: z.string().trim().max(2000),
});

export const quoteRequestSchema = z.object({
  locale: z.enum(routing.locales),
  customer: customerSchema,
  items: z.array(configurationSchema).min(1).max(20),
  /** Honeypot: real users never see or fill this. */
  website: z.string().max(0),
  turnstileToken: z.string().max(4096).optional(),
});

export type Customer = z.infer<typeof customerSchema>;
export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
