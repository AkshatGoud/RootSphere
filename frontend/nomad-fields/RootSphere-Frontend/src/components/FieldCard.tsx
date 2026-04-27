import { Sprout, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Field } from '@/types/api';

interface FieldCardProps {
  field: Field;
}

export function FieldCard({ field }: FieldCardProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <Card
      className="p-4 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98] animate-fade-in"
      onClick={() => navigate(`/field/${field.id}`)}
    >
      <div className="flex gap-4">
        <div className="shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Sprout className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base truncate">{field.name}</h3>
          <p className="text-sm text-muted-foreground">{t(field.crop)}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 bg-accent px-2 py-0.5 rounded-full">
              {t(field.growth_stage)}
            </span>
            {(field.lat !== undefined && field.lon !== undefined) && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {field.lat.toFixed(2)}, {field.lon.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
