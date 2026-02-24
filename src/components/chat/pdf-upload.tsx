'use client';

import { useCallback, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface PdfUploadProps {
  projectId: string;
  onUploadComplete: (text: string) => void;
}

export function PdfUpload({ projectId, onUploadComplete }: PdfUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (file.type !== 'application/pdf') {
        toast.error('Only PDF files are supported');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File must be under 10MB');
        return;
      }

      setIsUploading(true);
      setFileName(file.name);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', projectId);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) throw new Error('Upload failed');

        const data = await res.json();
        onUploadComplete(data.text);
        toast.success('PDF uploaded and parsed');
      } catch {
        toast.error('Failed to upload PDF');
        setFileName(null);
      } finally {
        setIsUploading(false);
      }
    },
    [projectId, onUploadComplete]
  );

  return (
    <div
      className={`relative rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
        isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
    >
      {fileName ? (
        <div className="flex items-center justify-center gap-2 text-sm">
          <FileText className="h-4 w-4" />
          <span>{fileName}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => setFileName(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center gap-2">
          <Upload className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {isUploading ? 'Uploading...' : 'Drop a PDF brief here, or click to browse'}
          </span>
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>
      )}
    </div>
  );
}
