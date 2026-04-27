import { Beaker } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import type { SensorSummary } from '@/types/api';
import { cn } from '@/lib/utils';

interface SoilSensorCardProps {
  sensors?: SensorSummary;
  className?: string;
}

export function SoilSensorCard({ sensors, className }: SoilSensorCardProps) {
  const { t } = useLanguage();

  if (!sensors) {
    return (
      <Card className={cn("p-4", className)}>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Beaker className="h-4 w-4 text-primary" />
          {t("Soil Sensors")}
        </h3>
        <p className="text-sm text-muted-foreground">{t("No sensor data available")}</p>
      </Card>
    );
  }

  const metrics = [
    { label: t('Moisture'), value: sensors.moisture, unit: '%', color: 'bg-soil-moisture' },
    { label: t('pH') || 'pH', value: sensors.ph, unit: '', color: 'bg-soil-ph' },
    { label: t('N') || 'N', value: sensors.n, unit: 'ppm', color: 'bg-soil-nitrogen' },
    { label: t('P') || 'P', value: sensors.p, unit: 'ppm', color: 'bg-soil-phosphorus' },
    { label: t('K') || 'K', value: sensors.k, unit: 'ppm', color: 'bg-soil-potassium' },
  ];

  return (
    <Card className={cn("p-4 animate-slide-up", className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Beaker className="h-4 w-4 text-primary" />
          {t("Soil Sensors")}
        </h3>
        {sensors.ts && (
          <span className="text-xs text-muted-foreground">
            {new Date(sensors.ts).toLocaleTimeString()}
          </span>
        )}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {metrics.map((metric) => (
          <div key={metric.label} className="text-center">
            <div className={`${metric.color} text-white rounded-lg py-2 px-1 mb-1`}>
              <span className="text-lg font-bold">
                {metric.value !== undefined ? metric.value.toFixed(1) : '—'}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">{metric.label}</span>
            {metric.unit && (
              <span className="text-xs text-muted-foreground block">{metric.unit}</span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
