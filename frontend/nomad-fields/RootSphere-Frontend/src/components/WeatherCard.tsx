import { Cloud, Thermometer, Droplets, CloudRain } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import type { WeatherSummary, WeatherPoint } from '@/types/api';
import { cn } from '@/lib/utils';

interface WeatherCardProps {
  weather?: WeatherSummary;
  forecast?: WeatherPoint[];
  className?: string;
}

export function WeatherCard({ weather, forecast, className }: WeatherCardProps) {
  const { t } = useLanguage();

  if (!weather) {
    return (
      <Card className={cn("p-4", className)}>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Cloud className="h-4 w-4 text-primary" />
          {t("Weather")}
        </h3>
        <p className="text-sm text-muted-foreground">{t("No weather data available")}</p>
      </Card>
    );
  }

  return (
    <Card className={cn("p-4 animate-slide-up", className)}>
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Cloud className="h-4 w-4 text-primary" />
        {t("Weather")}
      </h3>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 bg-accent rounded-lg">
          <Thermometer className="h-5 w-5 mx-auto mb-1 text-destructive" />
          <span className="text-xl font-bold">{weather.temp_c != null ? weather.temp_c.toFixed(1) : '—'}°</span>
          <p className="text-xs text-muted-foreground">{t("Temp")}</p>
        </div>
        <div className="text-center p-3 bg-accent rounded-lg">
          <Droplets className="h-5 w-5 mx-auto mb-1 text-info" />
          <span className="text-xl font-bold">{weather.humidity_pct != null ? weather.humidity_pct.toFixed(0) : '—'}%</span>
          <p className="text-xs text-muted-foreground">{t("Humidity")}</p>
        </div>
        <div className="text-center p-3 bg-accent rounded-lg">
          <CloudRain className="h-5 w-5 mx-auto mb-1 text-info" />
          <span className="text-xl font-bold">{weather.rainfall_mm_24h != null ? weather.rainfall_mm_24h.toFixed(1) : '—'}</span>
          <p className="text-xs text-muted-foreground">{t("Rain 24h")}</p>
        </div>
      </div>

      {forecast && forecast.length > 0 && (
        <>
          <h4 className="text-sm font-medium mb-2 text-muted-foreground">{t("forecast 72h")}</h4>

          {/* Header Row */}
          <div className="flex justify-between text-xs text-muted-foreground pb-2 border-b border-border font-medium">
             <span>{t("Time")}</span>
             <div className="flex gap-4">
                 <span className="w-8 text-right">{t("Temp")}</span>
                 <span className="w-10 text-right">{t("Rain")}</span>
             </div>
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto mt-2">
            {forecast.slice(0, 6).map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0"
              >
                <span className="text-muted-foreground">
                  {new Date(item.ts).toLocaleDateString(undefined, {
                    weekday: 'short',
                    hour: 'numeric'
                  })}
                </span>
                <div className="flex items-center gap-4 text-xs">
                  <span className="w-8 text-right">{item.temp_c.toFixed(1)}°</span>
                  <span className="text-info w-10 text-right">
                   {item.rainfall_mm > 0 ? `${item.rainfall_mm}mm` : '0mm'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
