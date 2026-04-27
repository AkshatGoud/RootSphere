import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fieldsApi, snapshotApi } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { getStageColors, getCropIcon } from "@/constants/crops";
import type { Field, FieldSnapshot } from "@/types/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function FieldsList() {
  const navigate = useNavigate();
  const [fields, setFields] = useState<Field[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<string>('name');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [snapshots, setSnapshots] = useState<Record<string, FieldSnapshot>>({});
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);

  const { farmerId } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (!farmerId) {
      navigate("/");
      return;
    }
    loadFields();
  }, [farmerId, navigate]);

  useEffect(() => {
    if (fields.length === 0) return;
    setSnapshotsLoading(true);
    Promise.allSettled(
      fields.map(f => snapshotApi.getLatest(f.id))
    ).then(results => {
      const map: Record<string, FieldSnapshot> = {};
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') map[fields[i].id] = r.value;
      });
      setSnapshots(map);
    }).finally(() => setSnapshotsLoading(false));
  }, [fields]);

  const loadFields = async () => {
    if (!farmerId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fieldsApi.list();
      setFields(data);
    } catch (err) {
      setError(t("Failed to load fields. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  const uniqueCrops = [...new Set(fields.map(f => f.crop))];
  const uniqueStages = [...new Set(fields.map(f => f.growth_stage))];

  const avgTemp = (() => {
    const temps = Object.values(snapshots).map(s => s.weather?.temp_c).filter((v): v is number => v != null);
    return temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : null;
  })();

  const avgMoisture = (() => {
    const vals = Object.values(snapshots).map(s => s.sensor_readings?.moisture).filter((v): v is number => v != null);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  })();

  const filteredSortedFields = fields
    .filter(f => stageFilter === 'all' || f.growth_stage.toLowerCase() === stageFilter.toLowerCase())
    .filter(f => !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.crop.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'crop') return a.crop.localeCompare(b.crop);
      if (sortBy === 'stage') return a.growth_stage.localeCompare(b.growth_stage);
      return 0;
    });

  return (
    <AppLayout>
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <nav className="flex mb-6 text-sm font-medium text-slate-500 dark:text-slate-400">
          <a
            className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
            onClick={() => navigate('/dashboard')}
          >
            <span className="material-symbols-outlined text-[18px]">dashboard</span>
            RootSphere
          </a>
          <span className="mx-2">/</span>
          <span className="text-slate-900 dark:text-white font-semibold">
            {t('Fields')}
          </span>
        </nav>

        {isLoading ? (
          /* Skeleton Loading */
          <div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                  <Skeleton className="h-10 w-10 rounded-lg mb-3" />
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-8 w-48" />
              <div className="flex gap-3">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-10 w-28" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-32 mb-4" />
                  <Skeleton className="h-12 w-full rounded-lg mb-4" />
                  <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl text-red-500">error</span>
            </div>
            <p className="text-slate-700 font-medium mb-2">{error}</p>
            <button
              onClick={loadFields}
              className="px-4 py-2 rounded border border-slate-300 hover:bg-slate-50"
            >
              {t('Try Again')}
            </button>
          </div>
        ) : fields.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-surface-light dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl text-primary">add_location_alt</span>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              {t('No fields yet')}
            </h3>
            <p className="text-slate-500 mb-6 text-center max-w-sm">
              {t('Start by adding your first field to get AI-powered recommendations.')}
            </p>
            <button
              onClick={() => navigate("/fields/new")}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-slate-900 shadow-sm hover:bg-primary-dark transition-all"
            >
              <span className="material-symbols-outlined">add</span>
              {t('Add Your First Field')}
            </button>
          </div>
        ) : (
          <div className="animate-fade-in">
            {/* KPI Summary Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 animate-slide-up">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <span className="material-symbols-outlined text-2xl text-green-600 dark:text-green-400">grass</span>
                  </div>
                </div>
                <p className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{fields.length}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">{t('Total Fields')}</p>
              </div>

              <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 animate-slide-up" style={{ animationDelay: '50ms' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <span className="material-symbols-outlined text-2xl text-amber-600 dark:text-amber-400">agriculture</span>
                  </div>
                </div>
                <p className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{uniqueCrops.length}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">{t('Crops Tracked')}</p>
              </div>

              <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 animate-slide-up" style={{ animationDelay: '100ms' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <span className="material-symbols-outlined text-2xl text-orange-600 dark:text-orange-400">thermostat</span>
                  </div>
                </div>
                <p className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {avgTemp != null ? `${avgTemp.toFixed(0)}°C` : '—'}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">{t('Avg Temperature')}</p>
              </div>

              <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 animate-slide-up" style={{ animationDelay: '150ms' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                    <span className="material-symbols-outlined text-2xl text-cyan-600 dark:text-cyan-400">water_drop</span>
                  </div>
                </div>
                <p className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {avgMoisture != null ? `${avgMoisture.toFixed(0)}%` : '—'}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">{t('Soil Moisture')}</p>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <span className="material-symbols-outlined">search</span>
              </div>
              <input
                className="block w-full rounded-lg border-0 bg-slate-100 dark:bg-slate-800 py-2.5 pl-10 pr-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary text-sm"
                placeholder={t("Search fields, crops, or reports...")}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Toolbar Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl mb-1">
                  {t('My Fields')}
                </h1>
                <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    {t('Active')}
                  </span>
                  <span>
                    {fields.length} {fields.length === 1 ? t("field") : t("fields")} {t('registered')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[140px] h-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm">
                    <SelectValue placeholder={t('Sort by')} />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <SelectItem value="name">{t('Name')}</SelectItem>
                    <SelectItem value="crop">{t('Crop')}</SelectItem>
                    <SelectItem value="stage">{t('Stage')}</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                  >
                    <span className="material-symbols-outlined text-[20px]">grid_view</span>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                  >
                    <span className="material-symbols-outlined text-[20px]">view_list</span>
                  </button>
                </div>
                <button
                  onClick={() => navigate("/fields/new")}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-slate-900 shadow-sm hover:bg-primary-dark transition-all"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  {t('Add Field')}
                </button>
              </div>
            </div>

            {/* Growth Stage Filter Chips */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
              <button
                onClick={() => setStageFilter('all')}
                className={`px-3 py-1.5 rounded-full text-sm border transition-all cursor-pointer whitespace-nowrap ${
                  stageFilter === 'all'
                    ? 'bg-primary/10 text-primary border-primary font-semibold'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary/50'
                }`}
              >
                {t('All')} ({fields.length})
              </button>
              {uniqueStages.map(stage => (
                <button
                  key={stage}
                  onClick={() => setStageFilter(stage)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-all cursor-pointer whitespace-nowrap ${
                    stageFilter === stage
                      ? 'bg-primary/10 text-primary border-primary font-semibold'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary/50'
                  }`}
                >
                  {t(stage)} ({fields.filter(f => f.growth_stage === stage).length})
                </button>
              ))}
            </div>

            {/* Fields Grid / List */}
            {filteredSortedFields.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-3">search_off</span>
                <p className="text-slate-500 dark:text-slate-400">{t('No fields match your filters.')}</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSortedFields.map((field) => {
                  const stageColors = getStageColors(field.growth_stage);
                  const snap = snapshots[field.id];
                  return (
                    <div
                      key={field.id}
                      onClick={() => navigate(`/field/${field.id}`)}
                      className="group relative overflow-hidden rounded-xl bg-surface-light dark:bg-surface-dark p-6 shadow-sm border border-slate-200 dark:border-slate-800 hover:border-primary/50 hover-lift cursor-pointer transition-all duration-300"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 ${stageColors.bg} rounded-lg`}>
                          <span className={`material-symbols-outlined text-3xl ${stageColors.text}`}>
                            {getCropIcon(field.crop)}
                          </span>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${stageColors.bg} ${stageColors.text} ${stageColors.border}`}>
                          {t(field.growth_stage)}
                        </span>
                      </div>

                      <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-1">
                        {t(field.name)}
                      </h3>
                      {field.name.toLowerCase() !== field.crop.toLowerCase() && (
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">
                          {t(field.crop)}
                        </p>
                      )}
                      {field.name.toLowerCase() === field.crop.toLowerCase() && <div className="mb-4" />}

                      {snap ? (
                        <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg mb-4 text-sm">
                          {snap.weather?.temp_c != null && (
                            <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                              <span className="material-symbols-outlined text-[16px]">thermostat</span>
                              {snap.weather.temp_c.toFixed(0)}°C
                            </span>
                          )}
                          {snap.weather?.humidity_pct != null && (
                            <span className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400">
                              <span className="material-symbols-outlined text-[16px]">water_drop</span>
                              {snap.weather.humidity_pct.toFixed(0)}%
                            </span>
                          )}
                          {snap.weather?.rainfall_mm_24h != null && (
                            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                              <span className="material-symbols-outlined text-[16px]">rainy</span>
                              {snap.weather.rainfall_mm_24h.toFixed(0)}mm
                            </span>
                          )}
                        </div>
                      ) : snapshotsLoading ? (
                        <Skeleton className="h-12 w-full rounded-lg mb-4" />
                      ) : null}

                      <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                          <span className="material-symbols-outlined text-[18px]">location_on</span>
                          {field.lat.toFixed(4)}, {field.lon.toFixed(4)}
                        </div>
                        <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 group-hover:text-primary transition-colors">
                          chevron_right
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredSortedFields.map((field) => {
                  const stageColors = getStageColors(field.growth_stage);
                  const snap = snapshots[field.id];
                  return (
                    <div
                      key={field.id}
                      onClick={() => navigate(`/field/${field.id}`)}
                      className="group flex items-center gap-4 p-4 bg-surface-light dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary/50 hover-lift cursor-pointer transition-all"
                    >
                      <div className={`p-2.5 ${stageColors.bg} rounded-lg shrink-0`}>
                        <span className={`material-symbols-outlined text-xl ${stageColors.text}`}>
                          {getCropIcon(field.crop)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 dark:text-white truncate">{t(field.name)}</p>
                        {field.name.toLowerCase() !== field.crop.toLowerCase() && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{t(field.crop)}</p>
                        )}
                      </div>
                      <span className={`hidden sm:inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${stageColors.bg} ${stageColors.text} ${stageColors.border}`}>
                        {t(field.growth_stage)}
                      </span>
                      {snap?.weather?.temp_c != null && (
                        <span className="hidden md:flex items-center gap-1 text-sm text-orange-600 dark:text-orange-400">
                          <span className="material-symbols-outlined text-[16px]">thermostat</span>
                          {snap.weather.temp_c.toFixed(0)}°C
                        </span>
                      )}
                      {snap?.sensor_readings?.moisture != null && (
                        <span className="hidden md:flex items-center gap-1 text-sm text-cyan-600 dark:text-cyan-400">
                          <span className="material-symbols-outlined text-[16px]">water_drop</span>
                          {snap.sensor_readings.moisture.toFixed(0)}%
                        </span>
                      )}
                      <span className="hidden lg:flex items-center gap-1 text-sm text-slate-400">
                        <span className="material-symbols-outlined text-[16px]">location_on</span>
                        {field.lat.toFixed(4)}, {field.lon.toFixed(4)}
                      </span>
                      <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 group-hover:text-primary transition-colors">
                        chevron_right
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

    </AppLayout>
  );
}
