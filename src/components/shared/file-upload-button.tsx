'use client';

import { useRef } from 'react';
import { Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileUploadButtonProps {
  onFilesSelected: (files: File[]) => void;
  className?: string;
  disabled?: boolean;
  accept?: string;
}

export function FileUploadButton({ onFilesSelected, className, disabled, accept }: FileUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);

          if (files.length > 0) {
            onFilesSelected(files);
          }

          event.currentTarget.value = '';
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className={cn('rounded-full', className)}
      >
        <Paperclip className="size-4.5" />
      </Button>
    </>
  );
}
