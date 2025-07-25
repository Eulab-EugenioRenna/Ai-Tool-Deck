
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
  link: z.string().optional().describe('Il link al sito web o repository GitHub dello strumento AI (opzionale).'),
  category: z.string().optional().describe('La categoria dello strumento AI fornita dall\'utente (opzionale).'),
  source: z.string().describe('La fonte da cui è stato scoperto lo strumento AI.'),
});
export type SummarizeAiToolInput = z.infer<typeof SummarizeAiToolInputSchema>;

const SummarizeAiToolOutputSchema = z.object({
  summary: z.string().describe('Un riepilogo sintetico dello strumento AI (massimo 3 righe) in lingua italiana.'),
  category: z.string().describe('La categoria dello strumento AI (es. Devtools, Generative Art, RAG, Productivity, Coding, No-code, Workflow, Prompting, A2A). Inferiscila se non fornita.'),
  tags: z.array(z.string()).describe('Tag associati allo strumento AI (es. Open Source, API, SaaS, UI-based, LLM-based, Multi-Agent, GPT4o, Self-hosted, Freemium).'),
  concepts: z.array(z.string()).describe('Concetti chiave, tecnologie correlate o problemi che lo strumento risolve (utile per la ricerca semantica). Ad esempio, per un tool RAG: "vector database", "document retrieval", "question answering".'),
  useCases: z.array(z.string()).describe('Possibili casi d\'uso dello strumento. Ad esempio: "customer support automation", "code generation", "content creation".'),
  apiAvailable: z.boolean().describe('Indica se lo strumento dispone di un’API.'),
  name: z.string().describe('Il nome originale dello strumento AI.'),
  normalizedName: z.string().describe('Il nome dello strumento AI, normalizzato e conciso (es. "Page Flows" invece di "UI/UX Design Inspiration for Apps and Websites — Page Flows").'),
  derivedLink: z.string().optional().describe('Il link al sito web o repository GitHub dello strumento AI, potenzialmente derivato dall\'analisi se non fornito inizialmente o se migliorato.'),
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
      link: z.string().optional().describe('Il link al sito web o repository GitHub dello strumento AI. Potrebbe essere vuoto o non del tutto corretto.'),
      category: z.string().optional().describe('La categoria dello strumento AI fornita dall\'utente (opzionale).'),
      source: z.string().describe('La fonte da cui è stato scoperto lo strumento AI.'),
      websiteDescription: z.string().optional().describe('Descrizione del sito web/repo, se disponibile e analizzato.'),
      websiteKeywords: z.string().optional().describe('Parole chiave del sito web/repo, se disponibili e analizzate.'),
      websiteTitle: z.string().optional().describe('Titolo del sito web/repo, se disponibile e analizzato.')
    }),
  },
  output: {
    schema: z.object({
      summary: z.string().describe('Un riepilogo sintetico dello strumento AI (massimo 3-4 righe) in lingua italiana. Deve essere informativo e accattivante.'),
      category: z.string().describe('La categoria più appropriata per il tool (es. Devtools, Generative Art, RAG, Chatbot, Productivity, Coding, No-code, Workflow, Prompting, A2A, Text-to-Image, Text-to-Video, Speech-to-Text). Inferiscila se non fornita, basandoti sull\'analisi del link e della descrizione. Sii specifico.'),
      tags: z.array(z.string()).describe('Tag concisi e pertinenti (massimo 5-7 tag) che descrivono le caratteristiche principali (es. Open Source, API, SaaS, Freemium, LLM-based, GPT-4o, Gemini, Local First, Self-hosted, AI Agent, Multi-Modal).'),
      concepts: z.array(z.string()).describe('Elenco di 3-5 concetti chiave, tecnologie sottostanti, o problemi specifici che lo strumento affronta (es. "vector embeddings", "retrieval augmented generation", "natural language processing", "code completion", "image recognition", "data analysis automation"). Questi aiuteranno nella ricerca avanzata.'),
      useCases: z.array(z.string()).describe('Elenco di 2-3 casi d\'uso pratici e specifici per lo strumento (es. "generating marketing copy", "automating code reviews", "creating video storyboards", "translating technical documents", "analyzing customer feedback").'),
      apiAvailable: z.boolean().describe('Indica se lo strumento sembra disporre di un\'API (true/false), basandoti sulle informazioni disponibili. In caso di dubbio, metti false.'),
      name: z.string().describe('Il nome originale fornito nell\'input, da restituire così com\'è.'),
      normalizedName: z.string().describe('Il nome dello strumento AI, normalizzato per essere conciso e ufficiale. Analizza il titolo del sito, la descrizione e l\'URL per derivare il nome più pulito. Esempio: se il titolo è "UI/UX Design Inspiration for Apps and Websites — Page Flows", il nome normalizzato dovrebbe essere "Page Flows". Se il nome in input è già pulito, restituiscilo.'),
      derivedLink: z.string().optional().describe('Il link web primario e più rilevante per lo strumento, inferito dall\'analisi del sito/repo se il link fornito non era ottimale o mancante. Se il link fornito in input è valido e corretto, restituiscilo qui. Se non è possibile derivare un link valido, lascia questo campo vuoto.'),
    }),
  },
  prompt: `Sei un agente AI esperto nella catalogazione e analisi dettagliata di strumenti di Intelligenza Artificiale. Il tuo compito è analizzare le informazioni fornite e restituire una scheda informativa completa e accurata **in lingua italiana**.

Informazioni Disponibili sul Tool AI:
Nome Fornito: {{name}}
Link Fornito (potrebbe essere assente o necessitare di verifica): {{#if link}}{{link}}{{else}}Non fornito{{/if}}
Categoria Fornita (usala come suggerimento prioritario): {{#if category}}{{category}}{{else}}Non fornita{{/if}}
Fonte di Scoperta: {{source}}
{{#if websiteTitle}}Titolo Sito Web/Repo Analizzato: {{websiteTitle}}{{/if}}
{{#if websiteDescription}}Descrizione Sito Web/Repo Analizzata: {{{websiteDescription}}}{{/if}}
{{#if websiteKeywords}}Parole Chiave Sito Web/Repo Analizzate: {{websiteKeywords}}{{/if}}

Istruzioni Dettagliate per l'Output (formato JSON):
1.  **name**: Restituisci il nome originale fornito nell'input: "{{name}}". Non modificarlo.
2.  **normalizedName**: **Questa è la parte più importante.** Deriva il nome più conciso, pulito e ufficiale del tool. Usa il \`websiteTitle\`, l'URL e la descrizione per capire qual è il vero nome del brand o del prodotto. Ad esempio, se l'input \`name\` è "UI/UX Design Inspiration for Apps and Websites — Page Flows", il \`normalizedName\` corretto è "Page Flows". Se l'input \`name\` è già corretto (es. "Genkit"), restituiscilo così com'è.
3.  **derivedLink**: Se il \`link\` fornito in input è valido e sembra essere il sito/repository ufficiale, restituiscilo. Se il \`link\` fornito è assente, o se dall'analisi emerge un link più pertinente (es. la homepage ufficiale invece di un articolo di blog), restituisci quello.
4.  **summary**: Genera un riepilogo conciso (massimo 3-4 righe, in italiano) che descriva lo scopo principale del tool.
5.  **category**: Determina la categoria più specifica e appropriata (es. Devtools, Generative Art, RAG, Productivity, ecc.). Se una categoria è fornita dall'utente, usala come riferimento principale, altrimenti inferiscila.
6.  **tags**: Estrai o inferisci una lista di tag (massimo 5-7) concisi e pertinenti (es. Open Source, API, SaaS, Freemium, Local First, AI Agent).
7.  **concepts**: Identifica 3-5 concetti chiave o problemi specifici che lo strumento affronta (es. "vector embeddings", "code completion", "image recognition").
8.  **useCases**: Descrivi 2-3 casi d'uso pratici e specifici (es. "generating marketing copy", "automating code reviews").
9.  **apiAvailable**: Determina se lo strumento offre un'API (true/false). In caso di incertezza, metti \`false\`.

Fornisci l'output ESCLUSIVAMENTE nel formato JSON specificato dallo schema. Assicurati che tutti i campi testuali siano in italiano.
`,
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
    let analysisData: Partial<WebsiteMetadata & GithubMetadata & { derivedLink?: string }> = {};

    try {
      if (input.link) {
        if (input.link.includes('github.com')) {
          const githubMeta = await analyzeGithubRepo(input.link);
          if (githubMeta) {
            analysisData = {
              ...analysisData,
              title: githubMeta.title,
              description: githubMeta.description,
              keywords: githubMeta.keywords,
              derivedLink: input.link // Assume GitHub link is canonical if provided
            };
          }
        } else {
          const websiteMeta = await analyzeWebsite(input.link);
          if (websiteMeta) {
            analysisData = {
              ...analysisData,
              title: websiteMeta.title,
              description: websiteMeta.description,
              keywords: websiteMeta.keywords,
              derivedLink: input.link // Assume website link is canonical if provided
            };
          }
        }
      }
    } catch (e) {
      console.warn(
        `Failed to analyze website/repo for AI tool ${input.name} at ${input.link || 'N/A'}: ${e}`
      );
    }

    const promptInput = {
      name: input.name,
      link: input.link,
      category: input.category,
      source: input.source,
      websiteTitle: analysisData.title ?? '',
      websiteDescription: analysisData.description ?? '',
      websiteKeywords: Array.isArray(analysisData.keywords) ? analysisData.keywords.join(', ') : (analysisData.keywords ?? ''),
    };

    const {output} = await summarizeAiToolPrompt(promptInput);

    return {
      summary: output?.summary ?? 'Riassunto non disponibile.',
      category: output?.category ?? input.category ?? 'Sconosciuta',
      tags: output?.tags ?? [],
      concepts: output?.concepts ?? [],
      useCases: output?.useCases ?? [],
      apiAvailable: output?.apiAvailable ?? false,
      name: input.name,
      normalizedName: output?.normalizedName ?? input.name,
      derivedLink: output?.derivedLink || input.link, // Prefer AI derived link, then original input link
    };
  }
);
