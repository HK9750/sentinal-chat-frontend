'use client';

import { Card, CardContent } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
}

export function StatCard({ title, value, icon: Icon, description }: StatCardProps) {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-600/10">
            <Icon className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="text-2xl font-semibold text-slate-200">{value}</p>
            {description && (
              <p className="text-xs text-slate-600">{description}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
