'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-4 lg:px-8">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 rounded-lg text-text-muted hover:bg-surface-light"
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>
        <h2 className="text-lg font-semibold text-text">{title}</h2>
      </div>

      <div className="flex items-center gap-3" />
    </header>
  );
}
