
'use client';

import {Button} from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, Bot, RefreshCcwDot, Upload } from 'lucide-react'; // Added Upload icon

interface NavbarProps {
  onAddToolClick: () => void;
  onUpdateAllToolsClick?: () => void; // Optional prop for the new button
  isUpdatingAllTools?: boolean; // To disable the button during update
  onImportClick?: () => void; // New prop for import functionality
}

export function Navbar({ onAddToolClick, onUpdateAllToolsClick, isUpdatingAllTools, onImportClick }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full px-4 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className=" flex h-16 gap-2 py-2 items-center justify-between">
        <Link href="/" className="flex items-center space-x-2 md:ml-2"> 
          <Bot className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg text-foreground hover:text-primary transition-colors">
            AI Tool Deck
          </span>
        </Link>
        <div className="flex items-center space-x-2">
          {onUpdateAllToolsClick && (
            <Button 
              onClick={onUpdateAllToolsClick} 
              size="icon" 
              variant="ghost" 
              className="text-muted-foreground hover:text-primary"
              disabled={isUpdatingAllTools}
              title="Aggiorna tutti i tool senza concetti chiave"
            >
              {isUpdatingAllTools ? <RefreshCcwDot className="h-4 w-4 animate-spin" /> : <RefreshCcwDot className="h-4 w-4" />}
            </Button>
          )}
          {onImportClick && (
            <Button 
              onClick={onImportClick} 
              size="icon" 
              variant="ghost" 
              className="text-muted-foreground hover:text-primary"
              title="Importa tool da CSV/JSON"
            >
              <Upload className="h-4 w-4" />
            </Button>
          )}
          <Button onClick={onAddToolClick} size="sm" className="w-4 p-4">
            <PlusCircle className="h-4 w-4" /> 
          </Button>
        </div>
      </div>
    </header>
  );
}
