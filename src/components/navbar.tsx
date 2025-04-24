'use client';

import {Button} from '@/components/ui/button';
import Link from 'next/link';

export function Navbar() {
  return (
    <nav className="bg-background border-b p-4 mb-8 flex justify-between items-center">
      <Link href="/" className="text-2xl font-bold">
        AI Tool Deck
      </Link>
    </nav>
  );
}
