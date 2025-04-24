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
  name: z.string().describe('The name of the AI tool.'),
  link: z.string().describe('The link to the AI tool website or GitHub repository.'),
  category: z.string().optional().describe('The category of the AI tool (optional).'),
  source: z.string().describe('The source where the AI tool was discovered.'),
});
export type SummarizeAiToolInput = z.infer<typeof SummarizeAiToolInputSchema>;

const SummarizeAiToolOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the AI tool (max 3 lines).'),
  category: z.string().describe('The category of the AI tool.'),
  tags: z.array(z.string()).describe('Tags associated with the AI tool.'),
  apiAvailable: z.boolean().describe('Whether the tool has an API available'),
  name: z.string().describe('The name of the AI tool.'),
});
export type SummarizeAiToolOutput = z.infer<typeof SummarizeAiToolOutputSchema>;

export async function summarizeAiTool(input: SummarizeAiToolInput): Promise<SummarizeAiToolOutput> {
  return summarizeAiToolFlow(input);
}

const summarizeAiToolPrompt = ai.definePrompt({
  name: 'summarizeAiToolPrompt',
  input: {
    schema: z.object({
      name: z.string().describe('The name of the AI tool.'),
      link: z.string().describe('The link to the AI tool website or GitHub repository.'),
      category: z.string().optional().describe('The category of the AI tool (optional).'),
      source: z.string().describe('The source where the AI tool was discovered.'),
      websiteDescription: z.string().optional().describe('Website description, if available'),
      websiteKeywords: z.string().optional().describe('Website keywords, if available'),
    }),
  },
  output: {
    schema: z.object({
      summary: z.string().describe('A concise summary of the AI tool (max 3 lines).'),
      category: z.string().describe('The category of the AI tool.'),
      tags: z.array(z.string()).describe('Tags associated with the AI tool.'),
      apiAvailable: z.boolean().describe('Whether the tool has an API available'),
      name: z.string().describe('The name of the AI tool.'),
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
