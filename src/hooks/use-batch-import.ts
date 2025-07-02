'use client';

import { useState, useCallback } from 'react';
import { summarizeAiTool } from '@/ai/flows/ai-tool-summarization';
import PocketBase from 'pocketbase';

const pb = new PocketBase('https://pocketbase.eulab.cloud');

export interface ImportRecord {
  nome: string;
  link: string;
}

export interface ImportError {
  record: ImportRecord;
  error: string;
  index: number;
}

export interface ImportStatus {
  total: number;
  processed: number;
  successful: number;
  failed: ImportError[];
  isRunning: boolean;
  currentRecord?: ImportRecord;
}

export interface BatchImportResult {
  status: ImportStatus;
  successfulRecords: ImportRecord[];
  failedRecords: ImportError[];
}

export function useBatchImport() {
  const [importStatus, setImportStatus] = useState<ImportStatus>({
    total: 0,
    processed: 0,
    successful: 0,
    failed: [],
    isRunning: false,
  });

  const validateRecord = useCallback((record: ImportRecord, index: number): string | null => {
    if (!record.nome || record.nome.trim() === '') {
      return 'Nome mancante';
    }
    
    if (!record.link || record.link.trim() === '') {
      return 'Link mancante';
    }

    // Validazione URL base
    try {
      new URL(record.link);
    } catch {
      return 'URL non valido';
    }

    return null;
  }, []);

  const processRecord = async (record: ImportRecord, index: number): Promise<{ success: boolean; error?: string }> => {
    try {
      // Verifica se esiste già un tool con lo stesso nome e link
      const existingTools = await pb.collection('tools_ai').getFullList({
        filter: `name = "${record.nome.replace(/"/g, '\\"')}" && link = "${record.link.replace(/"/g, '\\"')}" && deleted = false`,
      });

      if (existingTools.length > 0) {
        return { success: false, error: 'Tool già esistente con stesso nome e link' };
      }

      // Analizza il tool con AI
      const summaryOutput = await summarizeAiTool({
        name: record.nome,
        link: record.link,
        source: 'Importazione Batch',
      });

      // Salva nel database
      const dataToSave = {
        name: summaryOutput.name,
        link: summaryOutput.derivedLink || record.link,
        category: summaryOutput.category,
        source: 'Importazione Batch',
        summary: summaryOutput,
        deleted: false,
        brand: '', // Sarà vuoto per l'importazione batch
      };

      await pb.collection('tools_ai').create(dataToSave);
      return { success: true };
    } catch (error: any) {
      console.error(`Errore processando record ${index}:`, error);
      return { 
        success: false, 
        error: error?.data?.message || error?.message || 'Errore sconosciuto durante il salvataggio' 
      };
    }
  };

  const processBatch = useCallback(async (
    records: ImportRecord[],
    onProgress?: (status: ImportStatus) => void
  ): Promise<BatchImportResult> => {
    const initialStatus: ImportStatus = {
      total: records.length,
      processed: 0,
      successful: 0,
      failed: [],
      isRunning: true,
    };

    setImportStatus(initialStatus);
    onProgress?.(initialStatus);

    const failedRecords: ImportError[] = [];
    const successfulRecords: ImportRecord[] = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      // Aggiorna lo stato con il record corrente
      const currentStatus: ImportStatus = {
        total: records.length,
        processed: i,
        successful: successfulRecords.length,
        failed: failedRecords,
        isRunning: true,
        currentRecord: record,
      };
      
      setImportStatus(currentStatus);
      onProgress?.(currentStatus);

      // Validazione record
      const validationError = validateRecord(record, i);
      if (validationError) {
        failedRecords.push({
          record,
          error: validationError,
          index: i,
        });
        continue;
      }

      // Processa il record
      const result = await processRecord(record, i);
      
      if (result.success) {
        successfulRecords.push(record);
      } else {
        failedRecords.push({
          record,
          error: result.error || 'Errore sconosciuto',
          index: i,
        });
      }

      // Piccola pausa per evitare di sovraccaricare il sistema
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const finalStatus: ImportStatus = {
      total: records.length,
      processed: records.length,
      successful: successfulRecords.length,
      failed: failedRecords,
      isRunning: false,
    };

    setImportStatus(finalStatus);
    onProgress?.(finalStatus);

    return {
      status: finalStatus,
      successfulRecords,
      failedRecords,
    };
  }, [validateRecord]);

  const processFailedRecords = useCallback(async (
    failedRecords: ImportError[],
    onProgress?: (status: ImportStatus) => void
  ): Promise<BatchImportResult> => {
    const records = failedRecords.map(failed => failed.record);
    return processBatch(records, onProgress);
  }, [processBatch]);

  const resetStatus = useCallback(() => {
    setImportStatus({
      total: 0,
      processed: 0,
      successful: 0,
      failed: [],
      isRunning: false,
    });
  }, []);

  return {
    importStatus,
    processBatch,
    processFailedRecords,
    resetStatus,
  };
}
