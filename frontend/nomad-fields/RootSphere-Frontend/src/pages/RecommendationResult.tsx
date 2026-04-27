import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { recommendationApi, feedbackApi } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppLayout } from "@/components/AppLayout";
import { toast } from "sonner";
import type { Recommendation, WhyItem } from "@/types/api";

// Hoisted to module scope so they're built once, not per render.
const SEVERITY_STYLES: Record<string, string> = {
  danger: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
  warning: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
  success: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
  info: "bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700",
};

const SEVERITY_ICON_COLOR: Record<string, string> = {
  danger: "text-red-500",
  warning: "text-amber-500",
  success: "text-emerald-500",
  info: "text-slate-400",
};

const CATEGORY_BORDER: Record<string, string> = {
  red: "border-l-red-500",
  blue: "border-l-blue-500",
  amber: "border-l-amber-500",
  emerald: "border-l-emerald-500",
  purple: "border-l-purple-500",
  sky: "border-l-sky-500",
  slate: "border-l-slate-400",
};

const CATEGORY_ICON_COLOR: Record<string, string> = {
  red: "text-red-600 dark:text-red-400",
  blue: "text-blue-600 dark:text-blue-400",
  amber: "text-amber-600 dark:text-amber-400",
  emerald: "text-emerald-600 dark:text-emerald-400",
  purple: "text-purple-600 dark:text-purple-400",
  sky: "text-sky-600 dark:text-sky-400",
  slate: "text-slate-500 dark:text-slate-400",
};

const CATEGORY_ORDER = ['risk', 'irrigation', 'fertilizer', 'soil', 'image', 'weather', 'info'] as const;

export default function RecommendationResult() {
  const { fieldId } = useParams<{ fieldId: string }>();
  const navigate = useNavigate();
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackReason, setFeedbackReason] = useState("");
  const [showFeedbackReason, setShowFeedbackReason] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const { t, language } = useLanguage();

  useEffect(() => {
    if (fieldId) {
      generateRecommendation();
    }
  }, [fieldId]);

  const generateRecommendation = async () => {
    if (!fieldId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await recommendationApi.generate(fieldId);
      setRecommendation(data);
      // Determine if we should show feedback (not submitted yet)
      // For now, assume fresh recommendation needs feedback
      setFeedbackSubmitted(false);
      setShowFeedbackReason(false);
      setFeedbackReason("");
    } catch (err) {
      setError(t("Failed to generate recommendation. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (followed: boolean) => {
    if (!recommendation || !fieldId) return;

    if (!followed && !showFeedbackReason) {
      setShowFeedbackReason(true);
      return; // Wait for reason input
    }

    try {
      await feedbackApi.submit({
        field_id: fieldId,
        recommendation_id: recommendation.id,
        followed,
        // Immediate-feedback default: "improved" if user followed it,
        // "no_change" if they skipped (they can refine later via the
        // detailed Feedback page). Previously both branches sent
        // "no_change", which corrupted the dataset.
        outcome: followed ? 'improved' : 'no_change',
        notes: feedbackReason,
      });
      toast.success(t("Feedback submitted!"));
      setFeedbackSubmitted(true);
    } catch (err) {
      toast.error(t("Failed to submit feedback."));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark font-display flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <span className="material-symbols-outlined text-4xl text-primary">psychology</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t("Analyzing Field Data")}</h2>
        <p className="text-slate-500 mb-6 max-w-sm mx-auto">
          {t("AI is processing sensor readings, weather patterns, and soil conditions...")}
        </p>
      </div>
    );
  }

  if (error || !recommendation) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark font-display flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-3xl text-red-500">error</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">{t("Analysis Failed")}</h2>
        <p className="text-slate-500 mb-6">{error || t("Could not generate recommendation")}</p>
        <button
          onClick={generateRecommendation}
          className="flex items-center gap-2 bg-white border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50"
        >
          <span className="material-symbols-outlined text-lg">refresh</span>
          {t("Try Again")}
        </button>
      </div>
    );
  }

  return (
    <AppLayout>
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
        {/* Breadcrumbs */}
        <nav className="flex mb-6 text-sm font-medium text-slate-500 dark:text-slate-400">
          <Link to="/dashboard" className="hover:text-primary transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[18px]">dashboard</span>
            {t("Dashboard")}
          </Link>
          <span className="mx-2">/</span>
          <Link to={`/field/${fieldId}`} className="hover:text-primary transition-colors">
            {t("Field Details")}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-slate-900 dark:text-white font-semibold">{t("Analysis Result")}</span>
        </nav>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl mb-2">
              {t("Recommendation Result")}
            </h1>
            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide">
                <span className="material-symbols-outlined text-[14px]">check_circle</span> {t("Live")}
              </span>
              <span>{t("Generated on")} {new Date(recommendation.ts).toLocaleString(language)}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
              <span className="material-symbols-outlined text-[20px]">share</span>
              {t("Share")}
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-slate-900 shadow-sm hover:bg-primary-dark transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">download</span>
              {t("Export PDF")}
            </button>
          </div>
        </div>

        {/* Hero Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Irrigation Card */}
          <div className="group relative overflow-hidden rounded-xl bg-surface-light dark:bg-surface-dark p-6 shadow-sm border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-50">
              <span className="material-symbols-outlined text-9xl text-blue-50 dark:text-blue-900/20 -rotate-12 translate-x-4 -translate-y-4">water_drop</span>
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-blue-600 dark:text-blue-400">
                    <span className="material-symbols-outlined text-3xl">water_drop</span>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300 ring-1 ring-inset ring-slate-500/10">
                    {t("Action Required")}
                  </span>
                </div>
                <h3 className="text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t("Irrigation Plan")}
                </h3>
                <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {recommendation.irrigation.liters_per_acre} <span className="text-2xl font-semibold text-slate-500 dark:text-slate-400">{t("L / Acre")}</span>
                </p>
                <p className="mt-1 text-base text-slate-600 dark:text-slate-300 italic">
                  "{recommendation.irrigation.action}"
                </p>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-slate-400 mt-0.5">schedule</span>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{t("Schedule")}</p>
                    <p className="text-base text-slate-600 dark:text-slate-300">{recommendation.irrigation.timing}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fertilizer Card */}
          <div className="group relative overflow-hidden rounded-xl bg-surface-light dark:bg-surface-dark p-6 shadow-sm border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-50">
              <span className="material-symbols-outlined text-9xl text-amber-50 dark:text-amber-900/20 rotate-12 translate-x-4 -translate-y-4">nutrition</span>
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-amber-100 dark:bg-amber-900/40 rounded-lg text-amber-600 dark:text-amber-400">
                    <span className="material-symbols-outlined text-3xl">compost</span>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300 ring-1 ring-inset ring-slate-500/10">
                    {t("Standard")}
                  </span>
                </div>
                <h3 className="text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t("Fertilizer Application")}
                </h3>
                <div className="mt-2 flex items-baseline gap-4 flex-wrap">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{recommendation.fertilizer.n_kg_acre}</span>
                    <span className="text-xl font-semibold text-slate-500 dark:text-slate-400">{t("kg N")}</span>
                  </div>
                  <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 rotate-12"></div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{recommendation.fertilizer.p_kg_acre}</span>
                    <span className="text-xl font-semibold text-slate-500 dark:text-slate-400">{t("kg P")}</span>
                  </div>
                  <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 rotate-12"></div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{recommendation.fertilizer.k_kg_acre}</span>
                    <span className="text-xl font-semibold text-slate-500 dark:text-slate-400">{t("kg K")}</span>
                  </div>
                </div>
                <p className="mt-1 text-base text-slate-600 dark:text-slate-300 italic">
                  "{recommendation.fertilizer.action}"
                </p>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-slate-400 mt-0.5">agriculture</span>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{t("Timing")}</p>
                    <p className="text-base text-slate-600 dark:text-slate-300">{recommendation.fertilizer.timing}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Alert Banner — animate in once, then stay still (vestibular safety) */}
        {recommendation.risk_alert && (
          <div className="mb-6 rounded-xl border-2 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/40 p-5 flex items-start gap-4 animate-fade-in">
            <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-full shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-2xl text-red-600 dark:text-red-400">warning</span>
            </div>
            <div>
              <h3 className="font-bold text-red-800 dark:text-red-300 text-base mb-1">{t("Weather Alert")}</h3>
              <p className="text-sm text-red-700 dark:text-red-400">{recommendation.risk_alert}</p>
            </div>
          </div>
        )}

        {/* AI Explanation Accordion */}
        <div className="mb-8 rounded-xl bg-white dark:bg-surface-dark shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <details className="group" open>
            <summary className="flex w-full cursor-pointer items-center justify-between p-6 list-none bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary-dark dark:text-primary">
                  <span className="material-symbols-outlined text-[20px]">psychology</span>
                </div>
                <span className="text-lg font-bold text-slate-900 dark:text-white">{t("Why this recommendation?")}</span>
              </div>
              <span className="material-symbols-outlined transition-transform duration-300 group-open:rotate-180 text-slate-500">expand_more</span>
            </summary>
            <div className="border-t border-slate-200 dark:border-slate-800 p-6 md:p-8 bg-surface-light dark:bg-surface-dark">
              <div className="flex flex-col gap-6">
                {/* AI Analysis Summary */}
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {recommendation.ai_analysis || t("No detailed analysis provided.")}
                </p>

                {/* Categorized Why Cards */}
                {(() => {
                  const CATEGORY_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
                    risk:       { icon: "warning",       label: t("Risk Alerts"),        color: "red" },
                    irrigation: { icon: "water_drop",    label: t("Irrigation"),         color: "blue" },
                    fertilizer: { icon: "compost",       label: t("Fertilizer"),         color: "amber" },
                    soil:       { icon: "science",       label: t("Soil Analysis"),      color: "emerald" },
                    image:      { icon: "photo_camera",  label: t("Visual AI Analysis"), color: "purple" },
                    weather:    { icon: "cloud",         label: t("Weather"),            color: "sky" },
                    info:       { icon: "info",          label: t("Additional Info"),    color: "slate" },
                  };

                  // Normalize items
                  const items: WhyItem[] = recommendation.why.map(item => {
                    if (typeof item === 'object' && item !== null && 'category' in item) {
                      return item as WhyItem;
                    }
                    return { category: 'info' as const, icon: 'info', severity: 'info' as const, title: String(item), detail: '' };
                  });

                  // Group by category
                  const groups: Record<string, WhyItem[]> = {};
                  for (const item of items) {
                    if (!groups[item.category]) groups[item.category] = [];
                    groups[item.category].push(item);
                  }

                  return CATEGORY_ORDER
                    .filter(cat => groups[cat]?.length)
                    .map(cat => {
                      const config = CATEGORY_CONFIG[cat];
                      const catItems = groups[cat];
                      return (
                        <div key={cat} className={`rounded-lg border-l-4 ${CATEGORY_BORDER[config.color]} bg-white dark:bg-slate-900/50 overflow-hidden`}>
                          {/* Category Header */}
                          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                            <span className={`material-symbols-outlined text-lg ${CATEGORY_ICON_COLOR[config.color]}`}>{config.icon}</span>
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">{config.label}</h4>
                          </div>
                          {/* Category Items */}
                          <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {catItems.map((item, idx) => (
                              <div key={idx} className={`flex items-start gap-3 px-4 py-3 ${SEVERITY_STYLES[item.severity]}`}>
                                <span className={`material-symbols-outlined text-lg mt-0.5 shrink-0 ${SEVERITY_ICON_COLOR[item.severity]}`}>
                                  {item.severity === 'danger' ? 'error' : item.severity === 'warning' ? 'warning' : item.severity === 'success' ? 'check_circle' : 'info'}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.title}</p>
                                  {item.detail && (
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{item.detail}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    });
                })()}

                {/* Data Confidence Meter */}
                {(() => {
                  const pct = Math.round(recommendation.data_completeness * 100);
                  const level = pct >= 70 ? 'high' : pct >= 40 ? 'medium' : 'low';
                  const barColor = level === 'high' ? 'bg-emerald-500' : level === 'medium' ? 'bg-amber-500' : 'bg-red-500';
                  const labelColor = level === 'high' ? 'text-emerald-600 dark:text-emerald-400' : level === 'medium' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';
                  const labelText = level === 'high' ? t('High') : level === 'medium' ? t('Medium') : t('Low');

                  const snapshot = recommendation.snapshot_used;
                  const sources = [
                    { key: 'sensor readings', has: !!snapshot?.sensor_readings },
                    { key: 'weather', has: !!snapshot?.weather },
                    { key: 'images', has: (snapshot?.images?.length ?? 0) > 0 },
                    { key: 'forecast 72h', has: (snapshot?.weather?.forecast_72h?.length ?? 0) > 0 },
                  ];

                  return (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                          <span className="material-symbols-outlined text-lg text-slate-500">database</span>
                          {t("Data Confidence")}
                        </h4>
                        <span className={`text-sm font-bold ${labelColor}`}>{labelText} ({pct}%)</span>
                      </div>
                      {/* Progress bar */}
                      <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
                        <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                      {/* Source pills */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t("Sources Used")}:</span>
                        {sources.map(s => (
                          <span
                            key={s.key}
                            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
                              s.has
                                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 line-through'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[12px]">{s.has ? 'check' : 'close'}</span>
                            {t(s.key)}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Rainfall Forecast Mini-Chart */}
                {(() => {
                  const history = recommendation.ai_history || [];
                  const forecast = recommendation.ai_forecast || [];
                  if (history.length === 0 && forecast.length === 0) return null;

                  const allValues = [...history, ...forecast];
                  const maxVal = Math.max(...allValues, 1);

                  return (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-4">
                      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-3">
                        <span className="material-symbols-outlined text-lg text-sky-500">water_drop</span>
                        {t("AI Rainfall Prediction")}
                      </h4>
                      <div className="flex items-end gap-1 h-24">
                        {history.map((val, i) => (
                          <div key={`h-${i}`} className="flex-1 flex flex-col items-center gap-1">
                            <div
                              className="w-full bg-slate-300 dark:bg-slate-600 rounded-t transition-all"
                              style={{ height: `${Math.max((val / maxVal) * 100, 4)}%` }}
                              title={`${val.toFixed(1)}mm`}
                            />
                            <span className="text-[9px] text-slate-400 leading-none">-{history.length - i}</span>
                          </div>
                        ))}
                        {forecast.map((val, i) => (
                          <div key={`f-${i}`} className="flex-1 flex flex-col items-center gap-1">
                            <div
                              className="w-full bg-blue-400 dark:bg-blue-500 rounded-t transition-all"
                              style={{ height: `${Math.max((val / maxVal) * 100, 4)}%` }}
                              title={`${val.toFixed(1)}mm`}
                            />
                            <span className="text-[9px] text-blue-500 leading-none font-medium">+{i + 1}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-slate-300 dark:bg-slate-600 inline-block" /> {t("History")}</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-400 dark:bg-blue-500 inline-block" /> {t("Forecast")}</span>
                        <span className="ml-auto">mm/day</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </details>
        </div>
      </main>

      {/* Feedback Loop Footer */}
      {!feedbackSubmitted && (
        <div className="fixed bottom-20 md:bottom-4 left-0 right-0 z-40 mx-auto max-w-3xl px-4">
          <div className="rounded-xl bg-slate-900 dark:bg-slate-800 p-4 shadow-xl border border-slate-700/50 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 dark:bg-slate-700 text-primary">
                  <span className="material-symbols-outlined">thumbs_up_down</span>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-sm font-medium text-white">{t("Did you follow this recommendation?")}</p>
                  <p className="text-xs text-slate-400">{t("Your feedback improves our model accuracy.")}</p>
                </div>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  onClick={() => handleFeedback(false)}
                  className="flex-1 sm:flex-none group flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-transparent px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                  {t("No")}
                </button>
                <button
                  onClick={() => handleFeedback(true)}
                  className="flex-1 sm:flex-none group flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-bold text-slate-900 hover:bg-primary-dark transition-all shadow-[0_0_15px_rgba(19,236,109,0.3)] hover:shadow-[0_0_20px_rgba(19,236,109,0.5)] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-900"
                >
                  <span className="material-symbols-outlined text-[18px]">check</span>
                  {t("Yes, I did")}
                </button>
              </div>
            </div>
            {/* Reason Input (Hidden by default) */}
            {showFeedbackReason && (
              <div className="mt-4 pt-4 border-t border-slate-700 animate-in fade-in slide-in-from-top-2">
                <label className="block text-xs font-medium text-slate-400 mb-1" htmlFor="feedback-reason">{t("Reason for skipping (Optional)")}</label>
                <div className="flex gap-2">
                  <input
                    className="block w-full rounded-md border-0 bg-slate-800 py-1.5 text-white shadow-sm ring-1 ring-inset ring-slate-600 placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                    id="feedback-reason"
                    placeholder={t("e.g. Too much rain yesterday...")}
                    type="text"
                    value={feedbackReason}
                    onChange={(e) => setFeedbackReason(e.target.value)}
                  />
                  <button
                    onClick={() => handleFeedback(false)}
                    className="rounded-md bg-slate-700 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-600"
                  >
                    {t("Submit")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </AppLayout>
  );
}
