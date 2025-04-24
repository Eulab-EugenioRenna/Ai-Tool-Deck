'use server';
/**
 * @fileOverview Summarizes an AI tool based on provided information.
 *
 * - summarizeAiTool - A function that summarizes an AI tool.
 * - SummarizeAiToolInput - The input type for the summarizeAiTool function.
 * - SummarizeAiToolOutput - The return type for the summarizeAiTool function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import {analyzeWebsite, WebsiteMetadata} from '@/services/website-analyzer';
import {analyzeGithubRepo, GithubMetadata} from '@/services/github-analyzer';

const SummarizeAiToolInputSchema = z.object({
  name: z.string().describe('Il nome dello strumento AI.'),
  link: z.string().describe('Il link al sito web o repository GitHub dello strumento AI.'),
  category: z.string().optional().describe('La categoria dello strumento AI (opzionale).'),
  source: z.string().describe('La fonte da cui è stato scoperto lo strumento AI.'),
});
export type SummarizeAiToolInput = z.infer<typeof SummarizeAiToolInputSchema>;

const SummarizeAiToolOutputSchema = z.object({
  summary: z.string().describe('Un riepilogo sintetico dello strumento AI (massimo 3 righe).'),
  category: z.string().describe('La categoria dello strumento AI.'),
  tags: z.array(z.string()).describe('Tag associati allo strumento AI.'),
  apiAvailable: z.boolean().describe('Indica se lo strumento dispone di un’API.'),
  name: z.string().describe('Il nome dello strumento AI.'),
});
export type SummarizeAiToolOutput = z.infer<typeof SummarizeAiToolOutputSchema>;

export async function summarizeAiTool(input: SummarizeAiToolInput): Promise<SummarizeAiToolOutput> {
  return summarizeAiToolFlow(input);
}

const summarizeAiToolPrompt = ai.definePrompt({
  name: 'summarizeAiToolPrompt',
  input: {
    schema: z.object({
      name: z.string().describe('Il nome dello strumento AI.'),
      link: z.string().describe('Il link al sito web o repository GitHub dello strumento AI.'),
      category: z.string().optional().describe('La categoria dello strumento AI (opzionale).'),
      source: z.string().describe('La fonte da cui è stato scoperto lo strumento AI.'),
      websiteDescription: z.string().optional().describe('Descrizione del sito web, se disponibile'),
      websiteKeywords: z.string().optional().describe('Parole chiave del sito web, se disponibili'),
    }),
  },
  output: {
    schema: z.object({
      summary: z.string().describe('Un riepilogo sintetico dello strumento AI (massimo 3 righe).'),
      category: z.string().describe('La categoria dello strumento AI.'),
      tags: z.array(z.string()).describe('Tag associati allo strumento AI.'),
      apiAvailable: z.boolean().describe('Indica se lo strumento dispone di un’API.'),
      name: z.string().describe('Il nome dello strumento AI.'),
    }),
  },
  prompt: `Sei un agente AI specializzato nella scoperta, organizzazione e classificazione di strumenti di Intelligenza Artificiale (AI Tools). Crea una sintesi concisa dello strumento AI (massimo 3 righe), determina la sua categoria e i tag pertinenti e determina se ha un'API.

Nome del tool: {{name}}
Link: {{link}}
Categoria (se conosciuta): {{category}}
Fonte: {{source}}
Descrizione del sito web: {{websiteDescription}}
Parole chiave del sito web: {{websiteKeywords}}

Sintesi:`,
});

const summarizeAiToolFlow = ai.defineFlow<
  typeof SummarizeAiToolInputSchema,
  typeof SummarizeAiToolOutputSchema
>(
  {
    name: 'summarizeAiToolFlow',
    inputSchema: SummarizeAiToolInputSchema,
    outputSchema: SummarizeAiToolOutputSchema,
  },
  async input => {
    let websiteMetadata: WebsiteMetadata | GithubMetadata | null = null;
    try {
      if (input.link.includes('github.com')) {
        websiteMetadata = await analyzeGithubRepo(input.link);
      } else {
        websiteMetadata = await analyzeWebsite(input.link);
      }
    } catch (e) {
      console.warn(
        `Failed to analyze website for AI tool ${input.name} at ${input.link}: ${e}`
      );
    }

    const {output} = await summarizeAiToolPrompt({
      ...input,
      websiteDescription: websiteMetadata?.description ?? '',
      websiteKeywords: websiteMetadata?.keywords?.join(',') ?? '',
    });
    return {
      ...output!,
      name: input.name,
    };
  }
);
