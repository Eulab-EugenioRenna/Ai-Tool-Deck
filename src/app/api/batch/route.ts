
import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import PocketBase from 'pocketbase';
import {summarizeAiTool} from '@/ai/flows/ai-tool-summarization';

// Inizializza PocketBase
const pb = new PocketBase('https://pocketbase.eulab.cloud');

// Schema per un singolo tool nell'array di input
const ToolInputSchema = z.object({
  nome: z.string().min(1, {message: 'Il nome è obbligatorio'}),
  link: z.string().url({message: 'Il link deve essere un URL valido'}),
});

// Schema per l'input della richiesta: un array di tool
const BatchInputSchema = z.array(ToolInputSchema);

/**
 * Gestisce le richieste POST per l'elaborazione in blocco di tool AI.
 * @param request La richiesta Next.js in arrivo.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parsing e validazione del corpo della richiesta
    const body = await request.json();
    const validationResult = BatchInputSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Input non valido',
          details: validationResult.error.flatten().fieldErrors,
        },
        {status: 400}
      );
    }

    const toolsToProcess = validationResult.data;
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as {tool: z.infer<typeof ToolInputSchema>, error: string}[],
    };

    // 2. Elaborazione di ogni tool in sequenza
    for (const tool of toolsToProcess) {
      try {
        // Verifica se un tool con lo stesso nome e link esiste già
        const existingTools = await pb.collection('tools_ai').getFullList({
          filter: `name = "${tool.nome.replace(/"/g, '\\"')}" && link = "${tool.link.replace(/"/g, '\\"')}" && deleted = false`,
          first: 1, // Basta trovarne uno
        });

        if (existingTools.length > 0) {
          throw new Error('Tool già esistente con lo stesso nome e link.');
        }

        // Utilizza il flow Genkit per analizzare e arricchire il tool
        const summaryOutput = await summarizeAiTool({
          name: tool.nome,
          link: tool.link,
          source: 'API Batch Endpoint', // Fonte dell'inserimento
        });

        // Prepara i dati per il salvataggio in PocketBase
        const dataToSave = {
          name: summaryOutput.name,
          link: summaryOutput.derivedLink || tool.link,
          category: summaryOutput.category,
          source: 'API Batch Endpoint',
          summary: summaryOutput, // Salva l'intero oggetto di riepilogo
          deleted: false,
          brand: '', // Il brand non è fornito in questo scenario
        };

        // Salva il nuovo tool nel database
        await pb.collection('tools_ai').create(dataToSave);
        results.successful++;

      } catch (error: any) {
        results.failed++;
        results.errors.push({
          tool: tool,
          error: error?.data?.message || error?.message || 'Errore sconosciuto durante l\'elaborazione.',
        });
      }
    }

    // 3. Restituzione del riepilogo del processo
    return NextResponse.json(results, {status: 200});

  } catch (error: any) {
    // Gestisce errori generici (es. JSON malformato)
    return NextResponse.json(
      {error: 'Errore interno del server', details: error.message},
      {status: 500}
    );
  }
}
