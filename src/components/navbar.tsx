'use client';

import {Button} from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

export function Navbar() {
  return (
    <nav className="bg-background border-b p-4 mb-8 flex justify-between items-center">
      <Link href="/" className="text-2xl font-bold">
        AI Tool Deck
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Menu</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Link href="/" className="w-full block">
              AI Tools
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link href="/form" className="w-full block">
              Add AI Tool
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
