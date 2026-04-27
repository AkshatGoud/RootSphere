import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { fieldsApi, sensorsApi, snapshotApi } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import type { Field, Sensor, FieldSnapshot } from "@/types/api";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, Bar, XAxis, YAxis, CartesianGrid, ComposedChart } from "recharts";
import type { ChartConfig } from "@/components/ui/chart";

const chartConfig = {
  temp_c: {
    label: "Temperature (°C)",
    color: "#f59e0b",
  },
  rainfall_mm: {
    label: "Rainfall (mm)",
    color: "#3b82f6",
  },
} satisfies ChartConfig;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [fields, setFields] = useState<Field[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [snapshot, setSnapshot] = useState<FieldSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { farmerId, farmerName } = useAuth();
  const { t, language } = useLanguage();

  useEffect(() => {
    if (!farmerId) {
      navigate("/");
      return;
    }
    loadData();
  }, [farmerId, navigate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fieldsData, sensorsData] = await Promise.all([
        fieldsApi.list(),
        sensorsApi.list(),
      ]);
      setFields(fieldsData);
      setSensors(sensorsData);

      if (fieldsData.length > 0) {
        try {
          const snap = await snapshotApi.getLatest(fieldsData[0].id);
          setSnapshot(snap);
        } catch (err) {
          // Non-fatal: snapshot may not exist yet for a brand-new field.
        }
      }
    } catch (err) {
      toast.error(t("Failed to load dashboard"));
    } finally {
      setIsLoading(false);
    }
  };

  const activeSensors = sensors.filter((s) => s.status === "active");
  const draftSensors = sensors.filter((s) => s.status === "draft");

  const avgMoisture = snapshot?.sensor_readings?.moisture;
  const currentTemp = snapshot?.weather?.temp_c;
  const currentHumidity = snapshot?.weather?.humidity_pct;
  const forecast = snapshot?.weather?.forecast_72h || [];

  const chartData = forecast.map((point) => ({
    time: new Date(point.ts).toLocaleString(language, { weekday: "short", hour: "numeric" }),
    temp_c: point.temp_c,
    rainfall_mm: point.rainfall_mm,
  }));

  const today = new Date().toLocaleDateString(language, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <AppLayout>
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="material-symbols-outlined text-4xl text-primary animate-spin mb-4">
              change_circle
            </span>
            <p className="text-slate-500">{t('Loading dashboard...')}</p>
          </div>
        ) : (
          <div className="animate-fade-in">
            {/* Welcome Banner */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 mb-8">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl mb-1">
                  {t(getGreeting())}, {farmerName}!
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                  {t("Here's your farm overview")}
                </p>
              </div>
              <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">
                {today}
              </p>
            </div>

            {/* KPI Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* Total Fields */}
              <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 animate-slide-up">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <span className="material-symbols-outlined text-2xl text-green-600 dark:text-green-400">grass</span>
                  </div>
                </div>
                <p className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{fields.length}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">{t('Total Fields')}</p>
              </div>

              {/* Active Sensors */}
              <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 animate-slide-up" style={{ animationDelay: '50ms' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <span className="material-symbols-outlined text-2xl text-blue-600 dark:text-blue-400">sensors</span>
                  </div>
                </div>
                <p className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{activeSensors.length}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
                  {t('Active Sensors')}
                  {draftSensors.length > 0 && (
                    <span className="text-slate-400 dark:text-slate-500"> / {draftSensors.length} {t('draft')}</span>
                  )}
                </p>
              </div>

              {/* Featured Field Moisture (first field — not an average) */}
              <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 animate-slide-up" style={{ animationDelay: '100ms' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                    <span className="material-symbols-outlined text-2xl text-cyan-600 dark:text-cyan-400">water_drop</span>
                  </div>
                </div>
                <p className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {avgMoisture != null ? `${avgMoisture.toFixed(0)}%` : '—'}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
                  {fields[0]?.name ? t('Moisture in') + ' ' + fields[0].name : t('Soil Moisture')}
                </p>
              </div>

              {/* Featured Field Weather (first field — not an average) */}
              <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 animate-slide-up" style={{ animationDelay: '150ms' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <span className="material-symbols-outlined text-2xl text-amber-600 dark:text-amber-400">thermostat</span>
                  </div>
                </div>
                <p className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {currentTemp != null ? `${currentTemp.toFixed(0)}°C` : '—'}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
                  {fields[0]?.name
                    ? (currentHumidity != null ? `${currentHumidity.toFixed(0)}% ${t('humidity')} · ${fields[0].name}` : fields[0].name)
                    : t('Weather')}
                </p>
              </div>
            </div>

            {/* Weather Forecast Chart */}
            {chartData.length > 0 && (
              <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 mb-8 animate-slide-up" style={{ animationDelay: '200ms' }}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-xl text-primary">cloud</span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('72h Weather Forecast')}</h3>
                </div>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                    <XAxis dataKey="time" tick={{ fontSize: 11 }} className="text-slate-500" />
                    <YAxis yAxisId="temp" tick={{ fontSize: 11 }} className="text-slate-500" />
                    <YAxis yAxisId="rain" orientation="right" tick={{ fontSize: 11 }} className="text-slate-500" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      yAxisId="temp"
                      type="monotone"
                      dataKey="temp_c"
                      stroke="#f59e0b"
                      fill="#fef3c7"
                      strokeWidth={2}
                      name="Temperature (°C)"
                    />
                    <Bar
                      yAxisId="rain"
                      dataKey="rainfall_mm"
                      fill="#93c5fd"
                      radius={[3, 3, 0, 0]}
                      name="Rainfall (mm)"
                      barSize={16}
                    />
                  </ComposedChart>
                </ChartContainer>
                <div className="flex items-center gap-6 mt-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-amber-400"></span>
                    {t('Temperature')}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-blue-300"></span>
                    {t('Rainfall')}
                  </span>
                </div>
              </div>
            )}

            {/* Fields + Quick Actions + Sensors Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* My Fields - 2 col span */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">agriculture</span>
                    {t('My Fields')}
                  </h3>
                  <button
                    onClick={() => navigate('/fields')}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {t('View all')}
                  </button>
                </div>

                {fields.length === 0 ? (
                  <div className="bg-white dark:bg-surface-dark rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center justify-center text-center">
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-full mb-4">
                      <span className="material-symbols-outlined text-4xl text-primary">add_location_alt</span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">{t('No fields yet')}</h3>
                    <p className="text-slate-500 mb-4 text-sm">{t('Add your first field to get started.')}</p>
                    <button
                      onClick={() => navigate('/fields/new')}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-slate-900 shadow-sm hover:bg-primary-dark transition-all"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      {t('Add Field')}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {fields.slice(0, 6).map((field) => (
                      <div
                        key={field.id}
                        onClick={() => navigate(`/field/${field.id}`)}
                        className="group bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 hover:border-primary/50 hover:shadow-md cursor-pointer transition-all duration-200"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400 shrink-0">
                            <span className="material-symbols-outlined text-xl">agriculture</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-slate-900 dark:text-white truncate text-sm">{field.name}</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{t(field.crop)} · {t(field.growth_stage)}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">location_on</span>
                              {field.lat.toFixed(2)}, {field.lon.toFixed(2)}
                            </p>
                          </div>
                          <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 group-hover:text-primary transition-colors text-lg">chevron_right</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Quick Actions + Sensor Fleet */}
              <div className="flex flex-col gap-6">
                {/* Quick Actions */}
                <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">bolt</span>
                    {t('Quick Actions')}
                  </h3>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => navigate('/fields/new')}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-green-50 dark:hover:bg-green-900/20 border border-slate-200 dark:border-slate-700 hover:border-green-200 dark:hover:border-green-800 text-left transition-all group"
                    >
                      <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                        <span className="material-symbols-outlined text-lg">add</span>
                      </div>
                      <span className="font-medium text-sm text-slate-700 dark:text-slate-300">{t('Add Field')}</span>
                    </button>
                    <button
                      onClick={() => navigate('/sensors/new')}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 text-left transition-all group"
                    >
                      <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                        <span className="material-symbols-outlined text-lg">add</span>
                      </div>
                      <span className="font-medium text-sm text-slate-700 dark:text-slate-300">{t('Register Sensor')}</span>
                    </button>
                    {fields.length === 1 ? (
                      <button
                        onClick={() => navigate(`/field/${fields[0].id}/recommend`)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-slate-200 dark:border-slate-700 hover:border-purple-200 dark:hover:border-purple-800 text-left transition-all group"
                      >
                        <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                          <span className="material-symbols-outlined text-lg">auto_awesome</span>
                        </div>
                        <span className="font-medium text-sm text-slate-700 dark:text-slate-300">{t('Get Recommendation')}</span>
                      </button>
                    ) : fields.length > 1 ? (
                      <button
                        onClick={() => navigate('/fields')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-slate-200 dark:border-slate-700 hover:border-purple-200 dark:hover:border-purple-800 text-left transition-all group"
                      >
                        <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                          <span className="material-symbols-outlined text-lg">auto_awesome</span>
                        </div>
                        <span className="font-medium text-sm text-slate-700 dark:text-slate-300">{t('Pick a field for recommendation')}</span>
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* Sensor Fleet */}
                <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-xl">sensors</span>
                      {t('Sensor Fleet')}
                    </h3>
                    <button
                      onClick={() => navigate('/sensors')}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {t('View all')}
                    </button>
                  </div>

                  {sensors.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">{t('No sensors registered')}</p>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 mb-4 text-sm">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span className="text-slate-600 dark:text-slate-400">{activeSensors.length} {t('active')}</span>
                        </span>
                        {draftSensors.length > 0 && (
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                            <span className="text-slate-600 dark:text-slate-400">{draftSensors.length} {t('draft')}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        {sensors.slice(0, 5).map((sensor) => (
                          <div
                            key={sensor.id}
                            onClick={() => navigate(`/sensors/${sensor.id}`)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                          >
                            <span className={`w-2 h-2 rounded-full shrink-0 ${sensor.status === 'active' ? 'bg-emerald-500' : sensor.status === 'inactive' ? 'bg-red-400' : 'bg-slate-400'}`}></span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{sensor.name}</p>
                              <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                                {sensor.type} {sensor.current_assignment?.field_name ? `· ${sensor.current_assignment.field_name}` : ''}
                              </p>
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                              sensor.status === 'active'
                                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                            }`}>
                              {t(sensor.status || 'draft')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="hidden md:flex items-center justify-between px-8 py-4 border-t border-slate-200 dark:border-slate-800 mt-auto">
        <span className="text-xs text-slate-400">© {new Date().getFullYear()} RootSphere AI. All rights reserved.</span>
        <div className="flex items-center gap-6 text-xs text-slate-400">
          <a href="#" className="hover:text-slate-600 transition-colors">{t("Privacy Policy")}</a>
          <a href="#" className="hover:text-slate-600 transition-colors">{t("Terms of Service")}</a>
        </div>
      </footer>

    </AppLayout>
  );
}
