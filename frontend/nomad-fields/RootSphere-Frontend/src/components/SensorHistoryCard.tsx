import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { readingsApi, type SensorReadingPoint, type WeatherReadingPoint } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { Skeleton } from "@/components/ui/skeleton";

type Source = "sensor" | "weather";
type Metric =
  | { source: "sensor"; key: keyof Pick<SensorReadingPoint, "moisture" | "ph" | "n" | "p" | "k">; label: string; unit: string; color: string }
  | { source: "weather"; key: keyof Pick<WeatherReadingPoint, "temp_c" | "humidity_pct" | "rainfall_mm">; label: string; unit: string; color: string };

const METRICS: Metric[] = [
  { source: "sensor", key: "moisture", label: "Moisture", unit: "%", color: "#06b6d4" },
  { source: "sensor", key: "ph", label: "pH", unit: "", color: "#a855f7" },
  { source: "sensor", key: "n", label: "Nitrogen", unit: "ppm", color: "#22c55e" },
  { source: "sensor", key: "p", label: "Phosphorus", unit: "ppm", color: "#f59e0b" },
  { source: "sensor", key: "k", label: "Potassium", unit: "ppm", color: "#ec4899" },
  { source: "weather", key: "temp_c", label: "Temperature", unit: "°C", color: "#f97316" },
  { source: "weather", key: "humidity_pct", label: "Humidity", unit: "%", color: "#3b82f6" },
  { source: "weather", key: "rainfall_mm", label: "Rainfall", unit: "mm", color: "#0ea5e9" },
];

type RangeOption = { key: "24h" | "7d" | "30d"; label: string; days: number };
const RANGES: RangeOption[] = [
  { key: "24h", label: "24h", days: 1 },
  { key: "7d", label: "7d", days: 7 },
  { key: "30d", label: "30d", days: 30 },
];

interface Props {
  fieldId: string;
  className?: string;
}

export function SensorHistoryCard({ fieldId, className = "" }: Props) {
  const { t, language } = useLanguage();
  const [activeMetricKey, setActiveMetricKey] = useState<string>("moisture");
  const [range, setRange] = useState<RangeOption>(RANGES[1]); // default 7d
  const [sensorData, setSensorData] = useState<SensorReadingPoint[]>([]);
  const [weatherData, setWeatherData] = useState<WeatherReadingPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeMetric = useMemo(
    () => METRICS.find((m) => m.key === activeMetricKey) ?? METRICS[0],
    [activeMetricKey]
  );

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const end = new Date();
        const start = new Date(end.getTime() - range.days * 24 * 60 * 60 * 1000);
        const params = { start: start.toISOString(), end: end.toISOString(), limit: 500 };
        const [sensor, weather] = await Promise.all([
          readingsApi.listSensor(fieldId, params),
          readingsApi.listWeather(fieldId, params),
        ]);
        // API returns newest-first; reverse for chronological chart.
        setSensorData([...sensor].reverse());
        setWeatherData([...weather].reverse());
      } catch (err) {
        setError(t("Failed to load sensor history"));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [fieldId, range.days, t]);

  const chartData = useMemo(() => {
    if (activeMetric.source === "sensor") {
      return sensorData.map((r) => ({
        ts: r.ts,
        value: r[activeMetric.key],
        timeLabel: new Date(r.ts).toLocaleString(language, { month: "short", day: "numeric", hour: "numeric" }),
      }));
    }
    return weatherData.map((r) => ({
      ts: r.ts,
      value: r[activeMetric.key],
      timeLabel: new Date(r.ts).toLocaleString(language, { month: "short", day: "numeric", hour: "numeric" }),
    }));
  }, [activeMetric, sensorData, weatherData, language]);

  const stats = useMemo(() => {
    const values = chartData.map((d) => d.value).filter((v): v is number => typeof v === "number");
    if (values.length === 0) return null;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg,
      latest: values[values.length - 1],
    };
  }, [chartData]);

  return (
    <div
      className={`bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">timeline</span>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{t("Sensor History")}</h3>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                range.key === r.key
                  ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metric tabs */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setActiveMetricKey(m.key)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              activeMetricKey === m.key
                ? "text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
            style={
              activeMetricKey === m.key
                ? { backgroundColor: m.color }
                : undefined
            }
          >
            {t(m.label)}
            {m.unit && (
              <span className="opacity-70 ml-1">{m.unit}</span>
            )}
          </button>
        ))}
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-4 gap-2 mb-3 text-xs">
          {[
            { label: t("Latest"), value: stats.latest },
            { label: t("Avg"), value: stats.avg },
            { label: t("Min"), value: stats.min },
            { label: t("Max"), value: stats.max },
          ].map((s) => (
            <div key={s.label} className="bg-slate-50 dark:bg-slate-800/50 rounded-md p-2 text-center">
              <p className="text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide text-[10px]">
                {s.label}
              </p>
              <p className="font-bold text-slate-900 dark:text-white">
                {s.value.toFixed(1)}
                <span className="text-slate-500 ml-0.5 text-[10px]">{activeMetric.unit}</span>
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="h-[200px] w-full">
        {isLoading ? (
          <Skeleton className="h-full w-full rounded" />
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-3xl text-red-500 mb-2">error</span>
            <p className="text-sm text-slate-500">{error}</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-3xl text-slate-300 dark:text-slate-600 mb-2">
              query_stats
            </span>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("No readings in this range")}
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={`gradient-${activeMetric.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={activeMetric.color} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={activeMetric.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis
                dataKey="timeLabel"
                tick={{ fontSize: 10 }}
                className="text-slate-500"
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis tick={{ fontSize: 11 }} className="text-slate-500" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255,255,255,0.95)",
                  border: "1px solid #e2e8f0",
                  borderRadius: "0.5rem",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [
                  `${value.toFixed(2)} ${activeMetric.unit}`,
                  t(activeMetric.label),
                ]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={activeMetric.color}
                fill={`url(#gradient-${activeMetric.key})`}
                strokeWidth={2}
                name={t(activeMetric.label)}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Data point count footer */}
      {!isLoading && !error && chartData.length > 0 && (
        <p className="mt-3 text-xs text-slate-400 dark:text-slate-500 text-right">
          {chartData.length} {chartData.length === 1 ? t("reading") : t("readings")} · {range.label}
        </p>
      )}
    </div>
  );
}
