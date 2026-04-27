import { AlertTriangle } from 'lucide-react';

interface WarningBannerProps {
  title?: string;
  items: string[];
}

export function WarningBanner({ title = 'Missing Data', items }: WarningBannerProps) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-lg bg-warning/10 border border-warning/30 p-4 animate-fade-in">
      <div className="flex gap-3">
        <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium text-warning-foreground">{title}</p>
          <ul className="text-sm text-muted-foreground space-y-0.5">
            {items.map((item) => (
              <li key={item}>• {item.replace(/_/g, ' ')}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
