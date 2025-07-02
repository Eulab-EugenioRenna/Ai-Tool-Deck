'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { useBatchImport, ImportRecord, ImportError, ImportStatus } from '@/hooks/use-batch-import';
import { Upload, FileText, AlertCircle, CheckCircle, XCircle, RefreshCw, X } from 'lucide-react';
import Papa from 'papaparse';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ImportStep = 'upload' | 'preview' | 'processing' | 'results';

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [records, setRecords] = useState<ImportRecord[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<Set<number>>(new Set());
  const [fileName, setFileName] = useState<string>('');
  const [processingLogs, setProcessingLogs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { importStatus, processBatch, processFailedRecords, resetStatus } = useBatchImport();

  const resetDialog = useCallback(() => {
    setCurrentStep('upload');
    setRecords([]);
    setSelectedRecords(new Set());
    setFileName('');
    setProcessingLogs([]);
    resetStatus();
  }, [resetStatus]);

  const handleFileSelect = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let parsedRecords: ImportRecord[] = [];

        if (file.name.toLowerCase().endsWith('.csv')) {
          // Parse CSV
          const result = Papa.parse<ImportRecord>(content, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => {
              // Normalizza i nomi delle colonne
              const normalized = header.toLowerCase().trim();
              if (normalized === 'name' || normalized === 'nome' || normalized === 'title') {
                return 'nome';
              }
              if (normalized === 'url' || normalized === 'link' || normalized === 'website') {
                return 'link';
              }
              return normalized;
            }
          });

          if (result.errors.length > 0) {
            toast({
              title: 'Errore nel parsing CSV',
              description: `Errori trovati: ${result.errors.map(e => e.message).join(', ')}`,
              variant: 'destructive',
            });
            return;
          }

          parsedRecords = result.data.filter(record => record.nome && record.link);
        } else if (file.name.toLowerCase().endsWith('.json')) {
          // Parse JSON
          const jsonData = JSON.parse(content);
          
          if (!Array.isArray(jsonData)) {
            throw new Error('Il file JSON deve contenere un array di oggetti');
          }

          parsedRecords = jsonData.map((item: any) => {
            // Normalizza le proprietà dell'oggetto
            const nome = item.nome || item.name || item.title || '';
            const link = item.link || item.url || item.website || '';
            
            return { nome: String(nome).trim(), link: String(link).trim() };
          }).filter(record => record.nome && record.link);
        } else {
          throw new Error('Formato file non supportato. Utilizzare CSV o JSON.');
        }

        if (parsedRecords.length === 0) {
          toast({
            title: 'Nessun record valido',
            description: 'Il file non contiene record validi con campi "nome" e "link".',
            variant: 'destructive',
          });
          return;
        }

        setRecords(parsedRecords);
        // Seleziona automaticamente tutti i record
        setSelectedRecords(new Set(parsedRecords.map((_, index) => index)));
        setCurrentStep('preview');
        
        toast({
          title: 'File caricato con successo',
          description: `${parsedRecords.length} record trovati.`,
        });

      } catch (error: any) {
        console.error('Errore parsing file:', error);
        toast({
          title: 'Errore nel parsing del file',
          description: error.message || 'Impossibile leggere il file.',
          variant: 'destructive',
        });
      }
    };

    reader.readAsText(file);
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.json'))) {
      handleFileSelect(file);
    } else {
      toast({
        title: 'Formato file non valido',
        description: 'Seleziona un file CSV o JSON.',
        variant: 'destructive',
      });
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  // Funzioni per gestire la selezione dei record
  const toggleRecordSelection = useCallback((index: number) => {
    setSelectedRecords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  const selectAllRecords = useCallback(() => {
    setSelectedRecords(new Set(records.map((_, index) => index)));
  }, [records]);

  const deselectAllRecords = useCallback(() => {
    setSelectedRecords(new Set());
  }, []);

  const getSelectedRecords = useCallback(() => {
    return Array.from(selectedRecords).map(index => records[index]);
  }, [selectedRecords, records]);

  const startProcessing = useCallback(async () => {
    const selectedRecordsToProcess = getSelectedRecords();
    
    if (selectedRecordsToProcess.length === 0) {
      toast({
        title: 'Nessun record selezionato',
        description: 'Seleziona almeno un record da importare.',
        variant: 'destructive',
      });
      return;
    }
    
    setCurrentStep('processing');
    setProcessingLogs([]);
    
    const onProgress = (status: ImportStatus) => {
      const logs = [...processingLogs];
      
      if (status.currentRecord) {
        logs.push(`🔄 Processando: ${status.currentRecord.nome}`);
      }
      
      if (status.processed > 0) {
        const lastProcessed = selectedRecordsToProcess[status.processed - 1];
        const wasSuccessful = !status.failed.some(f => f.record === lastProcessed);
        
        if (wasSuccessful) {
          logs.push(`✅ ${lastProcessed.nome} - Aggiunto con successo`);
        } else {
          const error = status.failed.find(f => f.record === lastProcessed);
          logs.push(`❌ ${lastProcessed.nome} - ${error?.error || 'Errore sconosciuto'}`);
        }
      }
      
      setProcessingLogs(logs.slice(-20)); // Mantieni solo gli ultimi 20 log
    };

    try {
      await processBatch(selectedRecordsToProcess, onProgress);
      setCurrentStep('results');
    } catch (error: any) {
      console.error('Errore durante il processing:', error);
      toast({
        title: 'Errore durante l\'importazione',
        description: error.message || 'Si è verificato un errore imprevisto.',
        variant: 'destructive',
      });
    }
  }, [selectedRecords, records, processBatch, processingLogs, getSelectedRecords]);

  const retryFailedRecords = useCallback(async () => {
    if (importStatus.failed.length === 0) return;

    setCurrentStep('processing');
    setProcessingLogs([]);
    
    const onProgress = (status: ImportStatus) => {
      const logs = [...processingLogs];
      
      if (status.currentRecord) {
        logs.push(`🔄 Riprovando: ${status.currentRecord.nome}`);
      }
      
      if (status.processed > 0) {
        const retriedRecords = importStatus.failed.map(f => f.record);
        const lastProcessed = retriedRecords[status.processed - 1];
        const wasSuccessful = !status.failed.some(f => f.record === lastProcessed);
        
        if (wasSuccessful) {
          logs.push(`✅ ${lastProcessed.nome} - Successo al secondo tentativo`);
        } else {
          const error = status.failed.find(f => f.record === lastProcessed);
          logs.push(`❌ ${lastProcessed.nome} - ${error?.error || 'Errore sconosciuto'}`);
        }
      }
      
      setProcessingLogs(logs.slice(-20));
    };

    try {
      await processFailedRecords(importStatus.failed, onProgress);
      setCurrentStep('results');
    } catch (error: any) {
      console.error('Errore durante il retry:', error);
      toast({
        title: 'Errore durante il retry',
        description: error.message || 'Si è verificato un errore imprevisto.',
        variant: 'destructive',
      });
    }
  }, [importStatus.failed, processFailedRecords, processingLogs]);

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Carica File per Importazione</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Supporta file CSV e JSON con campi "nome" e "link"
        </p>
      </div>
      
      <div
        className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
        onDrop={handleFileDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
      >
        <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          Trascina qui il tuo file CSV o JSON, oppure clicca per selezionare
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.json"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      <Card className="p-4">
        <h4 className="font-semibold mb-2">Formato File Supportati:</h4>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div>
            <strong>CSV:</strong> File con header contenente colonne "nome" e "link"
          </div>
          <div>
            <strong>JSON:</strong> Array di oggetti con proprietà "nome" e "link"
          </div>
        </div>
      </Card>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Seleziona Record da Importare</h3>
        <Badge variant="secondary">{selectedRecords.size}/{records.length} selezionati</Badge>
      </div>
      
      <div className="flex items-center gap-2 mb-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={selectAllRecords}
          disabled={selectedRecords.size === records.length}
        >
          Seleziona Tutto
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={deselectAllRecords}
          disabled={selectedRecords.size === 0}
        >
          Deseleziona Tutto
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-base">File: {fileName}</CardTitle>
          <CardDescription>
            Seleziona i record che vuoi importare utilizzando i checkbox
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {records.map((record, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 border rounded hover:bg-muted/50 transition-colors">
                  <Checkbox
                    checked={selectedRecords.has(index)}
                    onCheckedChange={() => toggleRecordSelection(index)}
                    className="flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{record.nome}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {record.link}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );

  const renderProcessingStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Importazione in Corso</h3>
        <p className="text-sm text-muted-foreground">
          Processando {importStatus.total} record...
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progresso</span>
          <span>{importStatus.processed}/{importStatus.total}</span>
        </div>
        <Progress value={(importStatus.processed / importStatus.total) * 100} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">Successi</span>
          </div>
          <div className="text-2xl font-bold text-green-600">{importStatus.successful}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium">Errori</span>
          </div>
          <div className="text-2xl font-bold text-red-600">{importStatus.failed.length}</div>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Log in Tempo Reale</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-32">
            <div className="space-y-1 text-sm">
              {processingLogs.map((log, index) => (
                <div key={index} className="font-mono">{log}</div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );

  const renderResultsStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Importazione Completata</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">Successi</span>
          </div>
          <div className="text-2xl font-bold text-green-600">{importStatus.successful}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium">Errori</span>
          </div>
          <div className="text-2xl font-bold text-red-600">{importStatus.failed.length}</div>
        </Card>
      </div>

      {importStatus.failed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span>Record Falliti</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-32">
              <div className="space-y-2">
                {importStatus.failed.map((error, index) => (
                  <div key={index} className="text-sm border rounded p-2">
                    <div className="font-medium">{error.record.nome}</div>
                    <div className="text-red-600">{error.error}</div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const getDialogFooter = () => {
    switch (currentStep) {
      case 'upload':
        return (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
          </DialogFooter>
        );
      case 'preview':
        return (
          <DialogFooter>
            <Button variant="outline" onClick={() => setCurrentStep('upload')}>
              Indietro
            </Button>
            <Button 
              onClick={startProcessing}
              disabled={selectedRecords.size === 0}
            >
              Avvia Importazione ({selectedRecords.size} record)
            </Button>
          </DialogFooter>
        );
      case 'processing':
        return (
          <DialogFooter>
            <Button variant="outline" disabled>
              Importazione in corso...
            </Button>
          </DialogFooter>
        );
      case 'results':
        return (
          <DialogFooter>
            {importStatus.failed.length > 0 && (
              <Button variant="outline" onClick={retryFailedRecords}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Riprova Errori ({importStatus.failed.length})
              </Button>
            )}
            <Button onClick={() => onOpenChange(false)}>
              Chiudi
            </Button>
          </DialogFooter>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Importa Tool AI</span>
            {currentStep !== 'upload' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={resetDialog}
                className="ml-auto h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {currentStep === 'upload' && renderUploadStep()}
          {currentStep === 'preview' && renderPreviewStep()}
          {currentStep === 'processing' && renderProcessingStep()}
          {currentStep === 'results' && renderResultsStep()}
        </div>

        {getDialogFooter()}
      </DialogContent>
    </Dialog>
  );
}
