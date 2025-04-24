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
import {useRouter} from 'next/navigation';

export function Navbar() {
  const router = useRouter();

  return (
    <nav className="bg-background border-b p-4 mb-8 flex justify-between items-center">
      <h1 className="text-2xl font-bold">AI Tool Deck</h1>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Menu</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push('/')}>
            AI Tools
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/form')}>
            Add AI Tool
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
