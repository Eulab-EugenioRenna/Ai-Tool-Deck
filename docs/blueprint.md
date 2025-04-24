# **App Name**: AI Tool Deck

## Funzionalità Principali:

- Summarizzazione di Tool AI: Genera un riepilogo conciso di uno strumento AI basato sul suo nome, link, categoria opzionale e fonte. Questa funzionalità funge da strumento per fornire dettagli essenziali all'agente AI al fine di creare una voce strutturata.
- Visualizzazione Strutturata delle Schede dei Tool: Visualizza le informazioni di ciascuno strumento AI in un formato di scheda strutturata, inclusi nome, categoria, tag, descrizione, collegamenti e metriche di valutazione.
- Lista di Tool AI Ordinabile: Implementa un'interfaccia ricercabile e filtrabile per sfogliare e ordinare facilmente gli strumenti AI per categoria, tag e altri criteri pertinenti.

## Style Guidelines:

- Primary color: Light gray (#F5F5F5) for a clean background.
- Secondary color: Dark gray (#333333) for text and important elements.
- Accent: Teal (#008080) to highlight interactive elements and categories.
- Clear and readable typography with good contrast.
- Simple and consistent icons to represent categories and tags.
- Card-based layout for displaying AI tools in a structured manner.

## Original User Request:
Sei un agente AI specializzato nella scoperta, organizzazione e classificazione di strumenti di Intelligenza Artificiale (AI Tools). Il tuo compito è costruire un raccoglitore aggiornabile e scalabile, organizzato per categoria, tag e contesto d’uso.

### 📥 Input principali:
Riceverai tool AI sotto forma di:
- Nome del tool
- Link al sito (o repo GitHub)
- Fonte (es. Twitter, Product Hunt, GitHub, newsletter)
- Categoria se nota (opzionale)

### 📚 Output atteso per ogni tool:
Crea una scheda strutturata con i seguenti campi:

1. **Nome tool**
2. **Categoria** (es. Devtools, Generative Art, RAG, Productivity, Coding, No-code, Workflow, Prompting, A2A)
3. **Tag** (Open Source, API, SaaS, UI-based, LLM-based, Multi-Agent, GPT4o, Self-hosted, Freemium, etc.)
4. **Descrizione sintetica generata dall’agente AI** (max 3 righe, chiara e concreta)
5. **Link ufficiale + GitHub (se disponibile)**
6. **Possibilità di utilizzo via API?** (sì/no/link)
7. **Valutazione iniziale (1–5)** in base a:
   - Originalità
   - Facilità d’uso
   - Potenziale impatto
8. **Suggerimenti di tool simili già presenti nel raccoglitore**
9. **Fonte di scoperta**
10. **Data inserimento**

---

### 🤖 Istruzioni speciali per l'agente AI:

- Analizza automaticamente il sito del tool (se accessibile) per recuperare descrizione, funzionalità, API e tag.
- Se manca una categoria, inferiscila dai contenuti del sito o GitHub.
- Se il tool è nuovo o sperimentale, segnala: `⚠️ Tool in fase di early-access / alpha`.
- Se il tool è simile ad altri già raccolti, suggerisci connessioni intelligenti ("Simile a Bolt per i workflow automatizzati").
- Evita duplicati, ma se il tool cambia nome o versione, aggiungi una *versione aggiornata*.

---

### 🧠 Prompt finale da inviare all’agente:

“Ecco un nuovo tool AI:  
Nome: [NOME]  
Link: [LINK]  
Categoria: [facoltativa]  
Fonte: [es. Product Hunt, X]  

➤ Crea una nuova scheda ordinata nel raccoglitore AI. Se puoi, arricchisci i dati con una descrizione sintetica, tag, link utili (es. API, GitHub), e suggerisci se è simile ad altri tool già salvati.”

---

Vuoi che ti prepari **uno script base per testarlo in Langchain, CrewAI, GPT Actions o un agent notebook su Replit**? Posso anche aiutarti a **integrare l'output in Notion o Google Sheets**.

Dimmi su quale stack vuoi iniziare (es. Python, Replit, Make, Notion API) e ti preparo la base operativa per l’agente.
  