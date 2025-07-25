
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

// Assuming AiTool interface is defined elsewhere and imported
interface AiTool {
  id: string;
  name: string;
  link?: string;
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Duplicati Trovati</DialogTitle>
          <DialogDescription>
            Sono stati trovati dei tool con nomi simili. Seleziona quelli che vuoi eliminare.
            Per ogni gruppo, è consigliabile mantenere un solo tool.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {duplicateGroups.map(group => (
              <div key={group.key} className="border p-4 rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center">
                    {group.key}
                    <Badge variant="secondary" className="ml-2">{group.tools.length} Trovati</Badge>
                </h3>
                <div className="space-y-2">
                  {group.tools.map(tool => (
                    <div
                      key={tool.id}
                      className="flex items-center space-x-3 p-2 border rounded-md hover:bg-muted/50"
                    >
                      <Checkbox
                        id={`tool-${tool.id}`}
                        checked={selections[group.key]?.has(tool.id) || false}
                        onCheckedChange={() => handleSelectionChange(group.key, tool.id)}
                      />
                      <label
                        htmlFor={`tool-${tool.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="font-medium text-sm">{tool.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {tool.link || 'Nessun link'}
                        </div>
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
