
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
  summary: z.string().describe('Un riepilogo sintetico dello strumento AI (massimo 3 righe) in lingua italiana.'),
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
      category: z.string().optional().describe('La categoria dello strumento AI fornita dall\'utente (opzionale).'),
      source: z.string().describe('La fonte da cui è stato scoperto lo strumento AI.'),
      websiteDescription: z.string().optional().describe('Descrizione del sito web, se disponibile'),
      websiteKeywords: z.string().optional().describe('Parole chiave del sito web, se disponibili'),
    }),
  },
  output: {
    schema: z.object({
      summary: z.string().describe('Un riepilogo sintetico dello strumento AI (massimo 3 righe) in lingua italiana.'),
      // Infer the category based on the analysis. Use user-provided category as a strong hint.
      category: z.string().describe('La categoria dello strumento AI (es. Devtools, Generative Art, RAG, Productivity, Coding, No-code, Workflow, Prompting, A2A). Inferiscila se non fornita.'),
      tags: z.array(z.string()).describe('Tag associati allo strumento AI (es. Open Source, API, SaaS, UI-based, LLM-based, Multi-Agent, GPT4o, Self-hosted, Freemium).'),
      apiAvailable: z.boolean().describe('Indica se lo strumento dispone di un’API (true/false).'),
      name: z.string().describe('Il nome dello strumento AI (deve corrispondere all\'input).'), // Ensure name consistency
    }),
  },
  // Updated prompt for clarity, Italian output, and category inference guidance
  prompt: `Sei un agente AI esperto nella classificazione di strumenti di Intelligenza Artificiale. Il tuo compito è analizzare le informazioni fornite e restituire una scheda strutturata **in lingua italiana**.

Informazioni sul Tool AI:
Nome: {{name}}
Link: {{link}}
Categoria Fornita (usala come suggerimento prioritario): {{#if category}}{{category}}{{else}}Non fornita{{/if}}
Fonte: {{source}}
{{#if websiteDescription}}Descrizione Sito Web: {{websiteDescription}}{{/if}}
{{#if websiteKeywords}}Parole Chiave Sito Web: {{websiteKeywords}}{{/if}}

Istruzioni:
1.  **Genera un riepilogo conciso (massimo 3 righe) in italiano** che descriva lo scopo principale e le funzionalità chiave del tool.
2.  **Determina la categoria più appropriata** per il tool (es. Devtools, Generative Art, RAG, Productivity, Coding, No-code, Workflow, Prompting, A2A). Se una categoria è stata fornita dall'utente, usala come riferimento principale, altrimenti inferiscila dall'analisi del link e della descrizione.
3.  **Estrai o inferisci tag pertinenti** (es. Open Source, API, SaaS, UI-based, LLM-based, Multi-Agent, GPT4o, Self-hosted, Freemium).
4.  **Determina se è disponibile un'API** (true/false) basandoti sulle informazioni del sito/repo.
5.  **Restituisci il nome esatto** fornito nell'input.

Fornisci l'output ESCLUSIVAMENTE nel formato JSON specificato dallo schema di output.`,
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
       if (input.link && input.link.includes('github.com')) {
        websiteMetadata = await analyzeGithubRepo(input.link);
       } else if (input.link) {
        websiteMetadata = await analyzeWebsite(input.link);
      }
    } catch (e) {
      console.warn(
        `Failed to analyze website/repo for AI tool ${input.name} at ${input.link}: ${e}`
      );
    }

    const {output} = await summarizeAiToolPrompt({
      name: input.name,
      link: input.link,
      category: input.category, // Pass user-provided category to the prompt
      source: input.source,
      websiteDescription: websiteMetadata?.description ?? '',
      websiteKeywords: Array.isArray(websiteMetadata?.keywords) ? websiteMetadata.keywords.join(',') : '', // Ensure keywords is an array before join
    });

    // Ensure the output structure matches the schema, especially the name
    return {
      summary: output?.summary ?? '',
      category: output?.category ?? input.category ?? 'Unknown', // Fallback logic for category
      tags: output?.tags ?? [],
      apiAvailable: output?.apiAvailable ?? false,
      name: input.name, // Explicitly use the input name
    };
  }
);
