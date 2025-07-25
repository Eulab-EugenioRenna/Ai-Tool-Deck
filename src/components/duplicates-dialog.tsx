
'use client';

import React, { useState, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Trash } from 'lucide-react';
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

interface DuplicateGroup {
  key: string;
  tools: AiTool[];
}

interface DuplicatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicateGroups: DuplicateGroup[];
  onDelete: (toolIds: string[]) => void;
}

export function DuplicatesDialog({
  open,
  onOpenChange,
  duplicateGroups,
  onDelete,
}: DuplicatesDialogProps) {
  const [selections, setSelections] = useState<Record<string, Set<string>>>({});

  // Reset selections when dialog is opened/closed or groups change
  React.useEffect(() => {
    setSelections({});
  }, [open, duplicateGroups]);

  const handleSelectionChange = (groupKey: string, toolId: string) => {
    setSelections(prev => {
      const newSelections = { ...prev };
      if (!newSelections[groupKey]) {
        newSelections[groupKey] = new Set();
      }
      const groupSelections = newSelections[groupKey];
      if (groupSelections.has(toolId)) {
        groupSelections.delete(toolId);
      } else {
        groupSelections.add(toolId);
      }
      return newSelections;
    });
  };

  const handleDeleteSelected = () => {
    const idsToDelete = Object.values(selections).flatMap(set => Array.from(set));
    if (idsToDelete.length > 0) {
      onDelete(idsToDelete);
    }
  };

  const totalSelected = useMemo(() => {
    return Object.values(selections).reduce((acc, set) => acc + set.size, 0);
  }, [selections]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl"> {/* Increased width for more content */}
        <DialogHeader>
          <DialogTitle>Duplicati Trovati</DialogTitle>
          <DialogDescription>
            Sono stati trovati dei tool con nomi simili. Seleziona quelli che vuoi eliminare.
            Per ogni gruppo, è consigliabile mantenere un solo tool.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6"> {/* Increased space between groups */}
            {duplicateGroups.map(group => (
              <div key={group.key} className="border p-4 rounded-lg bg-card">
                <h3 className="font-semibold mb-3 flex items-center text-lg"> {/* Larger title */}
                    {group.key}
                    <Badge variant="secondary" className="ml-3">{group.tools.length} Trovati</Badge>
                </h3>
                <div className="space-y-3">
                  {group.tools.map(tool => (
                    <div
                      key={tool.id}
                      className="flex items-start space-x-4 p-3 border rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        id={`tool-${tool.id}`}
                        checked={selections[group.key]?.has(tool.id) || false}
                        onCheckedChange={() => handleSelectionChange(group.key, tool.id)}
                        className="mt-1"
                      />
                      <label
                        htmlFor={`tool-${tool.id}`}
                        className="flex-1 cursor-pointer space-y-2"
                      >
                        <div className="font-semibold text-base">{tool.name}</div>
                        <p className="text-sm text-muted-foreground">
                          {tool.summary?.summary || 'Nessun riassunto.'}
                        </p>
                        <div className="text-xs text-muted-foreground">
                          <strong>Link:</strong> <a href={tool.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{tool.link || 'N/D'}</a>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <strong>Categoria:</strong> {tool.summary?.category || tool.category || 'N/D'} | <strong>Brand:</strong> {tool.brand || 'N/D'}
                        </div>
                        {tool.summary?.tags && tool.summary.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {tool.summary.tags.map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Annulla</Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleDeleteSelected}
            disabled={totalSelected === 0}
          >
            <Trash className="mr-2 h-4 w-4" />
            Elimina Selezionati ({totalSelected})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
