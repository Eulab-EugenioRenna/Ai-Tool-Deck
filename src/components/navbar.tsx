
'use client';

import {Button} from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, Bot } from 'lucide-react'; // Added Bot icon for logo

interface NavbarProps {
  onAddToolClick: () => void;
}

export function Navbar({ onAddToolClick }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full px-4 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between">
        <Link href="/" className="flex items-center space-x-2 "> 
          <Bot className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg text-foreground hover:text-primary transition-colors">
            AI Tool Deck
          </span>
        </Link>
        <Button onClick={onAddToolClick} size="sm">
          <PlusCircle className="mr-2 h-4 w-4" /> Aggiungi Tool
        </Button>
      </div>
    </header>
  );
}
