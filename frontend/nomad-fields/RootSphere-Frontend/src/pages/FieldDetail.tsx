import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SoilSensorCard } from "@/components/SoilSensorCard";
import { WeatherCard } from "@/components/WeatherCard";
import { EditFieldDialog } from "@/components/EditFieldDialog";
import { AddImageDialog } from "@/components/AddImageDialog";
import { AppLayout } from "@/components/AppLayout";
import { snapshotApi, fieldsApi, resolveImageUrl } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { storage } from "@/lib/storage";
import { toast } from "sonner";
import type { FieldSnapshot, Field } from "@/types/api";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GROWTH_STAGE_COLORS,
  GROWTH_STAGES_ORDER,
  getStageColors,
  getCropIcon,
} from "@/constants/crops";

// Stage-specific care tips keyed by stage name. Values are translation keys.
const STAGE_TIPS: Record<string, { icon: string; tips: string[] }> = {
  seedling: {
    icon: 'eco',
    tips: [
      'stageTip.seedling.watering',
      'stageTip.seedling.thinning',
      'stageTip.seedling.protection',
      'stageTip.seedling.watchFor',
      'stageTip.seedling.nextStage',
    ],
  },
  vegetative: {
    icon: 'grass',
    tips: [
      'stageTip.vegetative.fertilizer',
      'stageTip.vegetative.weedControl',
      'stageTip.vegetative.irrigation',
    ],
  },
  flowering: {
    icon: 'local_florist',
    tips: [
      'stageTip.flowering.pollination',
      'stageTip.flowering.pestWatch',
      'stageTip.flowering.irrigation',
    ],
  },
  fruiting: {
    icon: 'nutrition',
    tips: [
      'stageTip.fruiting.potassium',
      'stageTip.fruiting.irrigation',
      'stageTip.fruiting.pestWatch',
    ],
  },
  mature: {
    icon: 'check_circle',
    tips: [
      'stageTip.mature.reduceWater',
      'stageTip.mature.harvestPrep',
      'stageTip.mature.grainCheck',
    ],
  },
  harvest: {
    icon: 'agriculture',
    tips: [
      'stageTip.harvest.timing',
      'stageTip.harvest.soilRecovery',
      'stageTip.harvest.storage',
    ],
  },
};

const getSourceBadge = (source: string): { icon: string; label: string } => {
  switch (source?.toLowerCase()) {
    case 'mobile': return { icon: 'smartphone', label: 'Mobile' };
    case 'drone': return { icon: 'flight', label: 'Drone' };
    case 'satellite': return { icon: 'satellite_alt', label: 'Satellite' };
    case 'webcam': return { icon: 'videocam', label: 'Webcam' };
    default: return { icon: 'photo_camera', label: 'Photo' };
  }
};

export default function FieldDetail() {
  const { fieldId } = useParams<{ fieldId: string }>();
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState<FieldSnapshot | null>(null);
  const [field, setField] = useState<Field | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [deleteImageId, setDeleteImageId] = useState<string | null>(null);
  const [isDeleteFieldOpen, setIsDeleteFieldOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (fieldId) {
      storage.setLastFieldId(fieldId);
      loadSnapshot();
    }
  }, [fieldId]);

  const loadSnapshot = async () => {
    if (!fieldId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [fieldData, snapshotData] = await Promise.all([
        fieldsApi.get(fieldId),
        snapshotApi.getLatest(fieldId),
      ]);
      setField(fieldData);
      setSnapshot(snapshotData);
    } catch (err) {
      setError(t("Failed to load field data. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  // Page shell that wraps loading, error, and loaded states.
  // Extra bottom padding (pb-20 md:pb-6) reserves space for the desktop action bar.
  const renderPageShell = (content: React.ReactNode) => (
    <AppLayout outerClassName="pb-20 md:pb-6">{content}</AppLayout>
  );

  // Loading State — skeleton inside shell (Fix 1, 2)
  if (isLoading) {
    return renderPageShell(
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb skeleton */}
        <div className="flex items-center gap-2 mb-6">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>
        {/* Title skeleton */}
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>
        {/* KPI row skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <Skeleton className="h-10 w-10 rounded-lg mb-3" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
        {/* Main grid skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <Skeleton className="h-5 w-24 mb-4" />
              <div className="grid grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            </div>
            <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <Skeleton className="h-5 w-24 mb-4" />
              <div className="grid grid-cols-5 gap-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            </div>
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <Skeleton className="aspect-[4/3]" />
                  <div className="p-4">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Error State — inside shell (Fix 1)
  if (error || !snapshot) {
    return renderPageShell(
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-950/30 rounded-full flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl text-red-500">error</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('Error Loading Field')}</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">{error || t('Field not found')}</p>
          <Link to="/fields" className="text-primary font-bold hover:underline">
            {t('Return to Fields')}
          </Link>
        </div>
      </main>
    );
  }

  const stageColors = getStageColors(field?.growth_stage || '');
  const cropIcon = getCropIcon(field?.crop || '');

  return renderPageShell(
    <>
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        {/* Breadcrumbs — Fix 10: use "/" separator, "Fields" as parent */}
        <nav className="flex mb-6 text-sm font-medium text-slate-500 dark:text-slate-400">
          <a onClick={() => navigate('/fields')} className="hover:text-primary cursor-pointer flex items-center gap-1 transition-colors">
            <span className="material-symbols-outlined text-[18px]">spa</span>
            {t('Fields')}
          </a>
          <span className="mx-2">/</span>
          <span className="text-slate-900 dark:text-white font-semibold">
            {field?.name || ''}
          </span>
        </nav>

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {field?.name || ''}
            </h1>
            {/* Fix 12: Field metadata with crop icon + color-coded stage badge */}
            <div className="flex items-center gap-2 flex-wrap text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <span className={`material-symbols-outlined text-[18px] ${stageColors.text}`}>{cropIcon}</span>
                <span className="capitalize font-medium">{t(field?.crop || '')}</span>
              </span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${stageColors.bg} ${stageColors.text} ${stageColors.border}`}>
                {t(field?.growth_stage || '')}
              </span>
              {snapshot.location && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span className="flex items-center gap-1 text-sm">
                    <span className="material-symbols-outlined text-[16px]">location_on</span>
                    {snapshot.location.lat.toFixed(4)}, {snapshot.location.lon.toFixed(4)}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditOpen(true)}
              className="group flex items-center justify-center gap-2 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white px-4 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-xl group-hover:text-primary transition-colors">edit</span>
              <span className="font-semibold text-sm">{t('Edit Field')}</span>
            </button>
            {/* Fix 7: Delete in dropdown menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center justify-center p-2.5 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm">
                  <span className="material-symbols-outlined text-xl">more_vert</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <DropdownMenuItem
                  onClick={() => navigate(`/field/${fieldId}/history`)}
                  className="cursor-pointer text-slate-700 dark:text-slate-300"
                >
                  <span className="material-symbols-outlined text-lg mr-2">history</span>
                  {t('History')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setIsDeleteFieldOpen(true)}
                  className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                >
                  <span className="material-symbols-outlined text-lg mr-2">delete_forever</span>
                  {t('Delete Field')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Fix 5: Dark mode for missing data warning */}
        {snapshot.missing_data && snapshot.missing_data.length > 0 && (
          <div className="mb-8 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-amber-500 mt-0.5">warning</span>
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-300">{t('Some data unavailable')}</p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                {snapshot.missing_data.map((item) => item.replace(/_/g, " ")).join(", ")}
              </p>
            </div>
          </div>
        )}

        {/* Fix 3: KPI Summary Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <span className="material-symbols-outlined text-2xl text-orange-600 dark:text-orange-400">thermostat</span>
              </div>
            </div>
            <p className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              {snapshot.weather?.temp_c != null ? `${snapshot.weather.temp_c.toFixed(1)}°` : '—'}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">{t('Temperature')}</p>
          </div>

          <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 animate-slide-up" style={{ animationDelay: '50ms' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                <span className="material-symbols-outlined text-2xl text-cyan-600 dark:text-cyan-400">water_drop</span>
              </div>
            </div>
            <p className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              {snapshot.weather?.humidity_pct != null ? `${snapshot.weather.humidity_pct.toFixed(0)}%` : '—'}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">{t('Humidity')}</p>
          </div>

          <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="material-symbols-outlined text-2xl text-green-600 dark:text-green-400">grass</span>
              </div>
            </div>
            <p className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              {snapshot.sensor_readings?.moisture != null ? `${snapshot.sensor_readings.moisture.toFixed(0)}%` : '—'}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">{t('Soil Moisture')}</p>
          </div>

          <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 animate-slide-up" style={{ animationDelay: '150ms' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <span className="material-symbols-outlined text-2xl text-blue-600 dark:text-blue-400">rainy</span>
              </div>
            </div>
            <p className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              {snapshot.weather?.rainfall_mm_24h != null ? `${snapshot.weather.rainfall_mm_24h.toFixed(1)}mm` : '—'}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">{t('Rainfall 24h')}</p>
          </div>
        </div>

        {/* Stage Progression Timeline */}
        <div className="mb-8 bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 animate-slide-up">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary">timeline</span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('Growth Stage Timeline')}</h3>
          </div>
          <div className="flex items-center justify-between gap-1 overflow-x-auto">
            {GROWTH_STAGES_ORDER.map((stageName, idx) => {
              const currentIdx = GROWTH_STAGES_ORDER.indexOf((field?.growth_stage || '').toLowerCase());
              const isActive = stageName === (field?.growth_stage || '').toLowerCase();
              const isPast = idx < currentIdx;
              const colors = GROWTH_STAGE_COLORS[stageName] || GROWTH_STAGE_COLORS.seedling;
              return (
                <div key={stageName} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center flex-1 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                        isActive
                          ? `${colors.bg} ${colors.text} ${colors.border} ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ring-primary/40`
                          : isPast
                          ? 'bg-primary/20 text-primary border-primary/40'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {isPast ? (
                        <span className="material-symbols-outlined text-[16px]">check</span>
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span
                      className={`text-[10px] sm:text-xs mt-1.5 font-medium text-center truncate w-full ${
                        isActive ? 'text-slate-900 dark:text-white font-bold' : isPast ? 'text-primary' : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {t(stageName.charAt(0).toUpperCase() + stageName.slice(1))}
                    </span>
                  </div>
                  {idx < GROWTH_STAGES_ORDER.length - 1 && (
                    <div
                      className={`h-0.5 w-full min-w-[8px] mx-0.5 rounded-full mt-[-16px] ${
                        idx < currentIdx ? 'bg-primary/40' : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Stage-Specific Care Tips Card */}
        {(() => {
          const currentStage = (field?.growth_stage || '').toLowerCase();
          const tipData = STAGE_TIPS[currentStage];
          if (!tipData) return null;
          const colors = getStageColors(currentStage);
          return (
            <div className={`mb-8 rounded-xl border shadow-sm p-5 animate-slide-up ${colors.bg} ${colors.border}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-2 rounded-lg ${colors.bg}`}>
                  <span className={`material-symbols-outlined text-xl ${colors.text}`}>{tipData.icon}</span>
                </div>
                <div>
                  <h3 className={`text-base font-bold ${colors.text}`}>
                    {t('Stage Guide')}: {t(currentStage.charAt(0).toUpperCase() + currentStage.slice(1))}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t('Care tips for this growth stage')}</p>
                </div>
              </div>
              <ul className="space-y-2">
                {tipData.tips.map((tipKey) => (
                  <li key={tipKey} className="flex items-start gap-2">
                    <span className={`material-symbols-outlined text-[16px] mt-0.5 ${colors.text}`}>check_circle</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{t(tipKey)}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}

        {/* Fix 6: Mobile action buttons — inline above main content */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8 md:hidden">
          <Button
            className="flex-1 h-12 bg-primary hover:bg-primary-dark text-slate-900 font-bold text-base shadow-lg shadow-primary/20"
            onClick={() => navigate(`/field/${fieldId}/recommend`)}
          >
            <span className="material-symbols-outlined mr-2">auto_awesome</span>
            {t('Generate Recommendation')}
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-12 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-base"
            onClick={() => navigate(`/field/${fieldId}/history`)}
          >
            <span className="material-symbols-outlined mr-2">history</span>
            {t('History')}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* Left Column: Weather & Sensors — Fix 11: remove double-border wrappers */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <WeatherCard
              weather={snapshot.weather}
              forecast={snapshot.weather?.forecast_72h}
              className="bg-white dark:bg-surface-dark border-slate-200 dark:border-slate-800 shadow-sm"
            />
            <SoilSensorCard
              sensors={snapshot.sensor_readings}
              className="bg-white dark:bg-surface-dark border-slate-200 dark:border-slate-800 shadow-sm"
            />
          </div>

          {/* Right Column: Images Gallery */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl text-primary">image</span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('Field Images')}</h3>
              </div>
              <button
                onClick={() => setIsImageOpen(true)}
                className="text-primary font-bold hover:underline flex items-center gap-1 text-sm"
              >
                <span className="material-symbols-outlined text-lg">add_a_photo</span>
                {t('Add Photo')}
              </button>
            </div>

            {snapshot.images && snapshot.images.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {snapshot.images.map((img, idx) => {
                  const badge = getSourceBadge(img.source);
                  return (
                    <div key={img.id || idx} className="group bg-white dark:bg-surface-dark rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md hover:border-primary/40 transition-all duration-300 flex flex-col">
                      <div className="relative aspect-[4/3] bg-gray-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                          style={{ backgroundImage: `url('${resolveImageUrl(img.rgb_url)}')` }}
                        ></div>
                        {/* Fix 8: Use img.source for badge */}
                        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs text-primary">{badge.icon}</span>
                          {t(badge.label)}
                        </div>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                          {img.id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteImageId(img.id);
                              }}
                              className="bg-white text-red-500 p-2 rounded-full hover:bg-red-500 hover:text-white transition-colors shadow-lg transform translate-y-4 group-hover:translate-y-0 duration-300"
                              title="Delete"
                            >
                              <span className="material-symbols-outlined text-xl">delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="p-4 flex flex-col gap-1 flex-1">
                        <div className="flex justify-between items-start">
                          <h5 className="font-bold text-slate-900 dark:text-white truncate text-sm">
                            {img.notes || `Image ${idx + 1}`}
                          </h5>
                        </div>
                        {/* Fix 9: Use typed img.ts */}
                        <div className="flex items-center justify-between mt-auto pt-2">
                          <span className="text-xs text-slate-500 font-medium">{new Date(img.ts || Date.now()).toLocaleDateString()}</span>
                          <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">{t('Uploaded')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white dark:bg-surface-dark rounded-xl p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-primary/50 transition-all cursor-pointer flex flex-col items-center justify-center text-center" onClick={() => setIsImageOpen(true)}>
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-full mb-4">
                  <span className="material-symbols-outlined text-4xl text-slate-400">add_a_photo</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{t('No images yet')}</h3>
                <p className="text-slate-500 text-sm">{t('Upload scout photos or drone imagery')}</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Fix 6: Desktop action bar */}
      <div className="hidden md:block fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-4 z-40">
        <div className="max-w-4xl mx-auto flex gap-3">
          <Button
            className="flex-1 h-12 bg-primary hover:bg-primary-dark text-slate-900 font-bold text-base shadow-lg shadow-primary/20"
            onClick={() => navigate(`/field/${fieldId}/recommend`)}
          >
            <span className="material-symbols-outlined mr-2">auto_awesome</span>
            {t('Generate Recommendation')}
          </Button>
          <Button
            variant="outline"
            className="h-12 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-base"
            onClick={() => navigate(`/field/${fieldId}/history`)}
          >
            <span className="material-symbols-outlined mr-2">history</span>
            {t('History')}
          </Button>
        </div>
      </div>

      {/* Delete Image Confirmation Dialog */}
      <Dialog open={!!deleteImageId} onOpenChange={(open) => !open && setDeleteImageId(null)}>
        <DialogContent className="max-w-sm bg-surface-light dark:bg-surface-dark border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">{t('Delete Image')}</DialogTitle>
            <DialogDescription className="text-slate-500">
              {t('Are you sure you want to delete this image? This action cannot be undone.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteImageId(null)} className="border-slate-300 dark:border-slate-600">
              {t('Cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleteImageId) return;
                try {
                  await snapshotApi.deleteImage(deleteImageId);
                  toast.success(t("Image deleted"));
                  setDeleteImageId(null);
                  loadSnapshot();
                } catch (error: any) {
                  toast.error(error?.message || t("Failed to delete image"));
                }
              }}
            >
              {t('Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {field && (
        <EditFieldDialog
          field={field}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          onSuccess={loadSnapshot}
        />
      )}

      {/* Add Image Dialog */}
      <AddImageDialog
        fieldId={fieldId!}
        open={isImageOpen}
        onOpenChange={setIsImageOpen}
        onSuccess={loadSnapshot}
      />

      {/* Delete Field Confirmation Dialog */}
      <Dialog open={isDeleteFieldOpen} onOpenChange={(open) => !open && setIsDeleteFieldOpen(false)}>
        <DialogContent className="max-w-md bg-surface-light dark:bg-surface-dark border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <div className="mx-auto w-14 h-14 bg-red-100 dark:bg-red-950/50 rounded-full flex items-center justify-center mb-2">
              <span className="material-symbols-outlined text-3xl text-red-500">warning</span>
            </div>
            <DialogTitle className="text-center text-slate-900 dark:text-white text-xl">
              {t('Delete this field?')}
            </DialogTitle>
            <DialogDescription className="text-center text-slate-500 dark:text-slate-400 pt-2">
              {t('This will permanently delete')} <span className="font-semibold text-slate-700 dark:text-slate-300">{field?.name}</span> {t('and all its data — sensor readings, weather history, images, and recommendations. This cannot be undone.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteFieldOpen(false)}
              disabled={isDeleting}
              className="flex-1 border-slate-300 dark:border-slate-600"
            >
              {t('Cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={isDeleting}
              className="flex-1"
              onClick={async () => {
                if (!fieldId) return;
                setIsDeleting(true);
                try {
                  await fieldsApi.delete(fieldId);
                  toast.success(t("Field deleted successfully"));
                  navigate('/fields');
                } catch (error: any) {
                  toast.error(error?.message || t("Failed to delete field"));
                  setIsDeleting(false);
                  setIsDeleteFieldOpen(false);
                }
              }}
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                  {t('Deleting...')}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">delete_forever</span>
                  {t('Delete Field')}
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
