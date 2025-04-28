'use server';
/**
 * @fileOverview Searches for AI tool details (link, category, brand) based on the tool name.
 *
 * - searchAiToolDetails - A function that searches for AI tool details.
 * - SearchAiToolDetailsInput - The input type for the searchAiToolDetails function.
 * - SearchAiToolDetailsOutput - The return type for the searchAiToolDetails function.
 */

import {ai} from '@/ai/ai-instance';
import { searchWebTool } from '@/ai/tools/web-search-tool'; // Corrected import path if necessary
import {z} from 'genkit';

const SearchAiToolDetailsInputSchema = z.object({
  name: z.string().describe('Il nome dello strumento AI da cercare.'),
});
export type SearchAiToolDetailsInput = z.infer<
  typeof SearchAiToolDetailsInputSchema
>;

const SearchAiToolDetailsOutputSchema = z.object({
  link: z
    .string()
    .optional()
    .describe('Il link ufficiale al sito web o repository dello strumento AI.'),
  category: z
    .string()
    .optional()
    .describe('La categoria principale dello strumento AI.'),
  brand: z
    .string()
    .optional()
    .describe('Il brand o la compagnia dietro lo strumento AI.'),
});
export type SearchAiToolDetailsOutput = z.infer<
  typeof SearchAiToolDetailsOutputSchema
>;

export async function searchAiToolDetails(
  input: SearchAiToolDetailsInput
): Promise<SearchAiToolDetailsOutput> {
  return searchAiToolDetailsFlow(input);
}

const searchPrompt = ai.definePrompt({
  name: 'searchAiToolDetailsPrompt',
  tools: [searchWebTool],
  input: {schema: SearchAiToolDetailsInputSchema},
  output: {schema: SearchAiToolDetailsOutputSchema},
  prompt: `Sei un ricercatore web esperto in lingua italiana. Dato il nome di uno strumento AI, il tuo compito è trovare le seguenti informazioni utilizzando la ricerca web:

1.  **Link Ufficiale:** Trova il link più probabile al sito web ufficiale o al repository principale (es. GitHub) dello strumento.
2.  **Categoria:** Determina la categoria principale a cui appartiene lo strumento (es. Devtools, Generative Art, RAG, Productivity, Coding, No-code, Workflow, Prompting, A2A). Se non sei sicuro, lascia vuoto.
3.  **Brand/Compagnia:** Identifica il nome del brand o della compagnia che sviluppa o possiede lo strumento. Se non è chiaro, lascia vuoto.

Nome dello Strumento AI: {{name}}

Utilizza lo strumento 'searchWeb' per trovare queste informazioni. Fornisci solo le informazioni richieste nel formato di output specificato.
Risultati della ricerca web: {{await searchWebTool query=name}}`,
});

const searchAiToolDetailsFlow = ai.defineFlow<
  typeof SearchAiToolDetailsInputSchema,
  typeof SearchAiToolDetailsOutputSchema
>(
  {
    name: 'searchAiToolDetailsFlow',
    inputSchema: SearchAiToolDetailsInputSchema,
    outputSchema: SearchAiToolDetailsOutputSchema,
  },
  async (input) => {
    const {output} = await searchPrompt(input);
    return output!;
  }
);
