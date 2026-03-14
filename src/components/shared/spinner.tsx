import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClassMap = {
  sm: 'size-4',
  md: 'size-6',
  lg: 'size-9',
} as const;

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return <LoaderCircle className={cn('animate-spin text-primary', sizeClassMap[size], className)} />;
}
