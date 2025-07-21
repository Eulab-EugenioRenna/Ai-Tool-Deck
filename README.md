# AI Tool Deck - Analisi dell'Applicazione

Questa applicazione è un catalogo intelligente per la gestione di una collezione di strumenti di intelligenza artificiale, denominato "AI Tool Deck". Consente agli utenti di aggiungere, visualizzare, filtrare, modificare ed eliminare strumenti AI, sfruttando un'architettura moderna e potenti integrazioni AI per arricchire automaticamente i dati.

## Architettura e Stack Tecnologico

L'applicazione è costruita su un'architettura robusta e moderna, sfruttando le migliori tecnologie per lo sviluppo web e l'integrazione AI.

-   **Frontend:**
    -   **Next.js 15 (App Router):** Framework React per applicazioni web performanti e renderizzate lato server (SSR).
    -   **React 18:** Libreria per la costruzione di interfacce utente interattive con componenti.
    -   **TypeScript:** Per un codice robusto, scalabile e con tipizzazione statica.
    -   **Tailwind CSS:** Framework CSS utility-first per uno styling rapido e personalizzabile.
    -   **ShadCN UI:** Collezione di componenti UI riutilizzabili, accessibili e stilisticamente coerenti.

-   **Backend & Database:**
    -   **PocketBase:** Backend open-source all-in-one che funge da database real-time, sistema di autenticazione e file storage. L'applicazione si connette a un'istanza hostata per la persistenza dei dati.

-   **Intelligenza Artificiale (GenAI):**
    -   **Genkit (v1.x):** Framework di Google per costruire, deployare e monitorare applicazioni AI.
    -   **Google AI (Gemini):** Utilizzato attraverso Genkit per le funzionalità generative, come l'analisi e la generazione di riassunti per i tool.

-   **Librerie Principali:**
    -   `lucide-react`: Per un set completo di icone moderne.
    -   `react-hook-form` & `zod`: Per la gestione e validazione avanzata dei form.
    -   `papaparse`: Per il parsing di file CSV nella funzionalità di importazione.
    -   `axios` & `cheerio`: Utilizzati nei servizi di analisi per effettuare scraping di metadati da siti web e repository.

---

## Funzionalità Chiave

### 1. Gestione dei Tool (CRUD)

-   **Visualizzazione:** I tool sono mostrati in un layout a griglia "masonry" reattivo, con card che ne riassumono le informazioni principali.
-   **Aggiunta (Create):** Un modale permette di inserire un nuovo tool. È sufficiente fornire un nome e un link; l'AI si occupa di analizzare il link (sito web o GitHub) e generare automaticamente:
    -   Un riassunto conciso.
    -   La categoria più appropriata (es. `Devtools`, `RAG`, `Generative Art`).
    -   Tag pertinenti (es. `Open Source`, `API`, `SaaS`).
    -   Concetti chiave e casi d'uso per la ricerca semantica.
-   **Modifica (Update):** Ogni card ha un'opzione per modificare i dati del tool. Il form di modifica permette di rigenerare i dettagli tramite AI o di aggiornarli manualmente.
-   **Eliminazione (Delete):** I tool possono essere "soft-deleted", ovvero contrassegnati come eliminati ma conservati nel database.

### 2. Ricerca e Filtraggio

L'interfaccia utente offre potenti strumenti per esplorare la collezione:
-   **Ricerca Full-Text:** Una barra di ricerca permette di trovare tool cercando per nome, link, riassunto, tag, concetti o casi d'uso.
-   **Filtri Avanzati:** È possibile filtrare la lista per **Categoria** e **Brand** tramite comode combobox.

### 3. Funzionalità AI (Genkit)

Il cuore dell'intelligenza dell'app risiede nel flow Genkit `summarizeAiToolFlow`:
-   **Analisi URL:** Quando un tool viene aggiunto, il sistema analizza il link fornito.
    -   Se è un repository **GitHub**, estrae descrizione, topic e stelle.
    -   Se è un **sito web**, esegue uno scraping per estrarre titolo, meta description e keywords.
-   **Arricchimento Dati:** Le informazioni raccolte vengono inviate a un modello Gemini, che genera una scheda informativa strutturata del tool in formato JSON, garantendo coerenza e ricchezza dei dati.
-   **Aggiornamento Massivo:** Una funzione speciale permette di scorrere tutti i tool esistenti e aggiornare quelli che non hanno ancora i "concetti chiave", arricchendoli con le ultime analisi dell'AI.

### 4. Importazione Batch

-   L'applicazione supporta l'importazione massiva di tool da file **CSV** o **JSON**.
-   Un'interfaccia guidata permette di:
    1.  Caricare il file.
    2.  Visualizzare un'anteprima dei record trovati e selezionare quali importare.
    3.  Processare i record in batch, con una barra di progresso e log in tempo reale.
    4.  Visualizzare un riepilogo dei successi e degli errori, con la possibilità di riprovare l'importazione per i record falliti.

---

## Struttura del Progetto

Il codice è organizzato in modo logico e manutenibile:

-   `src/app/`: Contiene le pagine e i layout dell'applicazione (standard Next.js App Router).
    -   `page.tsx`: Componente principale che renderizza l'intera interfaccia utente.
    -   `layout.tsx`: Layout radice dell'applicazione.
-   `src/components/`: Componenti React riutilizzabili.
    -   `ui/`: Componenti base di ShadCN (Button, Card, Dialog, etc.).
    -   `navbar.tsx`: La barra di navigazione superiore.
    -   `import-dialog.tsx`: Il modale per l'importazione batch.
-   `src/ai/`: Logica relativa all'intelligenza artificiale con Genkit.
    -   `ai-instance.ts`: Configurazione dell'istanza Genkit.
    -   `flows/ai-tool-summarization.ts`: Il flow principale per l'analisi e l'arricchimento dei tool.
-   `src/services/`: Moduli per interagire con servizi esterni.
    -   `website-analyzer.ts`: Funzione per lo scraping di metadati da siti web.
    -   `github-analyzer.ts`: Funzione per recuperare metadati da repository GitHub.
-   `src/hooks/`: Hook React personalizzati.
    -   `use-batch-import.ts`: Logica di stato per la funzionalità di importazione batch.
    -   `use-toast.ts`: Sistema di notifiche (toast).
-   `src/lib/`: Utilità generali.
    -   `utils.ts`: Funzioni di utilità, come `cn` per unire classi Tailwind.

---

## Come Avviare il Progetto

1.  **Installare le dipendenze:**
    ```bash
    npm install
    ```

2.  **Configurare le variabili d'ambiente:**
    -   Crea un file `.env.local` nella root del progetto.
    -   Aggiungi la tua chiave API per Google AI:
        ```env
        GOOGLE_GENAI_API_KEY=TUA_CHIAVE_API_QUI
        ```

3.  **Avviare il server di sviluppo:**
    L'applicazione richiede due processi in esecuzione: il server di sviluppo Next.js e il server Genkit per i flow AI.

    -   **Terminale 1: Avvia Next.js**
        ```bash
        npm run dev
        ```
        L'applicazione sarà disponibile su `http://localhost:9002`.

    -   **Terminale 2: Avvia Genkit in modalità watch**
        ```bash
        npm run genkit:watch
        ```
        Questo avvierà il server Genkit e lo riavvierà automaticamente ad ogni modifica nei file dei flow.

4.  **Utilizzare l'applicazione:**
    -   Apri `http://localhost:9002` nel tuo browser.
    -   Aggiungi, importa e gestisci i tuoi tool AI!
