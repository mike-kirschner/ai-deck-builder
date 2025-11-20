import { z } from 'zod';

// Section schema for structured content
export const SectionSchema = z.object({
  id: z.string(),
  heading: z.string(),
  bullets: z.array(z.string()).optional(),
  content: z.string().optional(),
  notes: z.string().optional(),
  order: z.number().optional(),
  metadata: z.record(z.any()).optional(),
});

// Presentation content schema (what agents output)
export const PresentationContentSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  audience: z.string().optional(),
  sections: z.array(SectionSchema),
  metadata: z.record(z.any()).optional(),
});

export type Section = z.infer<typeof SectionSchema>;
export type PresentationContent = z.infer<typeof PresentationContentSchema>;

// Presentation status
export const PresentationStatusSchema = z.enum([
  'draft',
  'in_review',
  'approved',
  'archived',
]);

export type PresentationStatus = z.infer<typeof PresentationStatusSchema>;

// Full presentation document
export const PresentationSchema = z.object({
  id: z.string(),
  title: z.string(),
  created_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  template_id: z.string(),
  status: PresentationStatusSchema,
  content: PresentationContentSchema,
  version: z.number().default(1),
  export_urls: z.object({
    html: z.string().optional(),
    pdf: z.string().optional(),
    pptx: z.string().optional(),
  }).optional(),
  tags: z.array(z.string()).optional(),
});

export type Presentation = z.infer<typeof PresentationSchema>;

