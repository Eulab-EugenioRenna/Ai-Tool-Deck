
'use client';

import {Button} from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react'; // Import an icon

interface NavbarProps {
  onAddToolClick: () => void; // Callback function for adding a tool
}


export function Navbar({ onAddToolClick }: NavbarProps) {
  return (
    <nav className="bg-card border-b p-4 mb-6 flex justify-between items-center sticky top-0 z-40 shadow-sm">
      <Link href="/" className="text-xl font-bold text-foreground hover:text-primary transition-colors">
        AI Tool Deck
      </Link>
       <Button onClick={onAddToolClick} size="sm">
          <PlusCircle className="mr-2 h-4 w-4" /> Aggiungi Tool
       </Button>
    </nav>
  );
}
