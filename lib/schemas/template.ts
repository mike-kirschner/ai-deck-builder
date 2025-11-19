import { z } from 'zod';

// Template field definition
export const TemplateFieldSchema = z.object({
  name: z.string(),
  type: z.enum(['text', 'array', 'object', 'html']),
  required: z.boolean().default(false),
  description: z.string().optional(),
});

// Template schema
export const TemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  version: z.number().default(1),
  html_content: z.string(),
  allowed_sections: z.array(z.string()).optional(),
  required_fields: z.array(z.string()).optional(),
  output_type: z.enum(['single_slide', 'multi_slide', 'one_pager', 'narrative']),
  tags: z.array(z.string()).optional(),
  brand: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  is_active: z.boolean().default(true),
  field_schema: z.array(TemplateFieldSchema).optional(),
  metadata: z.record(z.any()).optional(),
});

export type Template = z.infer<typeof TemplateSchema>;
export type TemplateField = z.infer<typeof TemplateFieldSchema>;

