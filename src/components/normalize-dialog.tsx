
'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, CaseSensitive } from 'lucide-react';
import type { SummarizeAiToolOutput } from '@/ai/flows/ai-tool-summarization';

// Definizione completa di AiTool per avere accesso a tutti i campi
interface AiTool {
  id: string;
  name: string;
  link?: string;
  category: string;
  source: string;
  summary: SummarizeAiToolOutput;
  brand?: string;
}

interface NormalizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tools: AiTool[];
  onNormalize: (toolIds: string[]) => void;
  isNormalizing: boolean;
}

export function NormalizeDialog({
  open,
  onOpenChange,
  tools,
  onNormalize,
  isNormalizing,
}: NormalizeDialogProps) {
  const [selections, setSelections] = useState<Set<string>>(new Set());

  // Reset selections when dialog is opened
  React.useEffect(() => {
    if (open) {
      setSelections(new Set());
    }
  }, [open]);

  const handleSelectionChange = (toolId: string) => {
    setSelections(prev => {
      const newSelections = new Set(prev);
      if (newSelections.has(toolId)) {
        newSelections.delete(toolId);
      } else {
        newSelections.add(toolId);
      }
      return newSelections;
    });
  };

  const handleSelectAll = () => {
    if (selections.size === tools.length) {
      setSelections(new Set());
    } else {
      setSelections(new Set(tools.map(t => t.id)));
    }
  };

  const handleNormalizeSelected = () => {
    const idsToNormalize = Array.from(selections);
    if (idsToNormalize.length > 0) {
      onNormalize(idsToNormalize);
    }
  };

  const totalSelected = selections.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Normalizza Nomi Tool</DialogTitle>
          <DialogDescription>
            Seleziona i tool per i quali vuoi che l'AI provi a normalizzare il nome.
            Questa operazione aggiornerà anche le altre informazioni del tool.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2 my-2">
            <Checkbox
                id="select-all-normalize"
                checked={totalSelected === tools.length && tools.length > 0}
                onCheckedChange={handleSelectAll}
                />
            <label
                htmlFor="select-all-normalize"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                Seleziona/Deseleziona Tutto
            </label>
        </div>
        <ScrollArea className="max-h-[60vh] pr-4 border rounded-md">
          <div className="space-y-2 p-2">
            {tools.map(tool => (
              <div
                key={tool.id}
                className="flex items-center space-x-3 p-2 border rounded-md"
              >
                <Checkbox
                  id={`tool-norm-${tool.id}`}
                  checked={selections.has(tool.id)}
                  onCheckedChange={() => handleSelectionChange(tool.id)}
                />
                <label
                  htmlFor={`tool-norm-${tool.id}`}
                  className="flex-1 cursor-pointer"
                >
                  <div className="font-semibold">{tool.name}</div>
                  <div className="text-xs text-muted-foreground">{tool.summary?.derivedLink || tool.link}</div>
                </label>
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isNormalizing}>Annulla</Button>
          </DialogClose>
          <Button
            onClick={handleNormalizeSelected}
            disabled={totalSelected === 0 || isNormalizing}
          >
            {isNormalizing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CaseSensitive className="mr-2 h-4 w-4" />
            )}
            Normalizza Selezionati ({totalSelected})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
