'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileJson, FileText, Table } from 'lucide-react';

interface ExportMenuProps {
  searchId: string;
}

export function ExportMenu({ searchId }: ExportMenuProps) {
  function handleExport(format: string) {
    window.open(`/api/culture-wire/${searchId}/export?format=${format}`, '_blank');
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 border border-gray-200 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-gray-500 transition-colors hover:border-[#8B3F4F] hover:text-[#8B3F4F] rounded-lg">
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="border-gray-200 bg-white">
        <DropdownMenuItem onClick={() => handleExport('csv')} className="text-xs uppercase tracking-wider">
          <Table className="mr-2 h-3.5 w-3.5" />
          CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('json')} className="text-xs uppercase tracking-wider">
          <FileJson className="mr-2 h-3.5 w-3.5" />
          JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('markdown')} className="text-xs uppercase tracking-wider">
          <FileText className="mr-2 h-3.5 w-3.5" />
          Markdown
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
