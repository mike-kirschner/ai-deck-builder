import { z } from 'zod';

// Knowledge base article schema
export const KnowledgeBaseArticleSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  type: z.enum(['article', 'deck', 'spec', 'note', 'data', 'position_paper']),
  tags: z.array(z.string()).optional(),
  brand: z.string().optional(),
  owner: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  source_url: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  // For Azure AI Search
  embedding: z.array(z.number()).optional(),
});

export type KnowledgeBaseArticle = z.infer<typeof KnowledgeBaseArticleSchema>;

// Knowledge base upload request
export const KnowledgeBaseUploadSchema = z.object({
  title: z.string(),
  content: z.string(),
  type: z.enum(['article', 'deck', 'spec', 'note', 'data', 'position_paper']),
  tags: z.array(z.string()).optional(),
  brand: z.string().optional(),
  file: z.instanceof(File).optional(),
});

export type KnowledgeBaseUpload = z.infer<typeof KnowledgeBaseUploadSchema>;

