'use client';

import { ScrollArea } from '@/components/ui/scroll-area';

interface DataTableProps {
  headers: string[];
  rows: Record<string, unknown>[];
}

export function DataTable({ headers, rows }: DataTableProps) {
  if (rows.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No data</p>;
  }

  return (
    <ScrollArea className="w-full">
      <div className="min-w-[800px]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              {headers.map((h) => (
                <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 100).map((row, i) => (
              <tr key={i} className="border-b last:border-0">
                {headers.map((h) => {
                  const value = row[h];
                  const full =
                    value === null || value === undefined
                      ? ''
                      : typeof value === 'object'
                        ? JSON.stringify(value)
                        : String(value);
                  const limit = typeof value === 'object' ? 200 : 300;
                  const display = full.length > limit ? full.slice(0, limit) + '…' : full;
                  const isTruncated = full.length > limit;
                  return (
                    <td
                      key={h}
                      className="max-w-[300px] truncate px-3 py-2"
                      title={isTruncated ? full.slice(0, 500) : undefined}
                    >
                      {display}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 100 && (
          <p className="py-2 text-center text-xs text-muted-foreground">
            Showing 100 of {rows.length} rows
          </p>
        )}
      </div>
    </ScrollArea>
  );
}
