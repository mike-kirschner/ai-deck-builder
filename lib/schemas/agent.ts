import { z } from 'zod';
import { PresentationContentSchema } from './presentation';

// Agent request for outline generation
export const OutlineAgentRequestSchema = z.object({
  question: z.string(),
  audience: z.string().optional(),
  tone: z.string().optional(),
  length: z.string().optional(), // e.g., "5-7 slides"
  context_instructions: z.string().optional(),
  template_id: z.string().optional(),
  use_knowledge_base: z.boolean().default(true),
});

export type OutlineAgentRequest = z.infer<typeof OutlineAgentRequestSchema>;

// Agent response
export const OutlineAgentResponseSchema = z.object({
  content: PresentationContentSchema,
  template_suggestion: z.string().optional(),
  confidence: z.number().optional(),
  sources_used: z.array(z.string()).optional(),
});

export type OutlineAgentResponse = z.infer<typeof OutlineAgentResponseSchema>;

// Refinement request
export const RefinementRequestSchema = z.object({
  section_id: z.string().optional(),
  content: z.string(),
  instructions: z.string(), // e.g., "rewrite for CFO, keep it to 4 bullets"
  tone: z.string().optional(),
});

export type RefinementRequest = z.infer<typeof RefinementRequestSchema>;

