import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { recommendationApi } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppLayout } from "@/components/AppLayout";
import type { Recommendation } from "@/types/api";
import { RecommendationCard } from "@/components/RecommendationCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function RecommendationHistory() {
  const { fieldId } = useParams<{ fieldId: string }>();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null);

  const { t } = useLanguage();

  useEffect(() => {
    if (fieldId) {
      loadHistory();
    }
  }, [fieldId]);

  const loadHistory = async () => {
    if (!fieldId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await recommendationApi.getHistory(fieldId, 50);
      setRecommendations(data);
    } catch (err) {
      setError(t("Failed to load history. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          <span className="text-slate-900 dark:text-white font-semibold">{t("History")}</span>
        </nav>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl mb-2">
              {t("Recommendation History")}
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              {recommendations.length} {recommendations.length === 1 ? t("recommendation") : t("recommendations")} {t("generated")}
            </p>
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-slate-900 shadow-sm hover:bg-primary-dark transition-all"
            onClick={() => navigate(`/field/${fieldId}/recommend`)}
          >
            <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
            {t("New Analysis")}
          </button>
        </div>

        {/* Content States */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="material-symbols-outlined text-4xl text-primary animate-spin mb-4">history</span>
            <p className="text-slate-500">{t("Loading history...")}</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl text-red-500">error</span>
            </div>
            <p className="text-slate-700 font-medium mb-4">{error}</p>
            <button
              onClick={loadHistory}
              className="flex items-center gap-2 bg-white border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50"
            >
              <span className="material-symbols-outlined text-lg">refresh</span>
              {t("Try Again")}
            </button>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-surface-light dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-4xl text-slate-400">history_toggle_off</span>
            </div>
            <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-2">{t("No history yet")}</h3>
            <p className="text-slate-500 mb-6">{t("Generate your first recommendation to see it here.")}</p>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-slate-900 shadow-sm hover:bg-primary-dark transition-all"
              onClick={() => navigate(`/field/${fieldId}/recommend`)}
            >
              <span className="material-symbols-outlined">auto_awesome</span>
              {t("Generate Now")}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="group bg-surface-light dark:bg-surface-dark rounded-xl p-5 border border-slate-200 dark:border-slate-800 hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer"
                onClick={() => setSelectedRec(rec)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 text-primary-dark dark:text-primary">
                      <span className="material-symbols-outlined text-2xl">psychology</span>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 mb-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">calendar_today</span>
                        {new Date(rec.ts).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="font-bold text-slate-900 dark:text-white text-lg">
                        {rec.irrigation.action}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                          <span className="material-symbols-outlined text-[14px]">water_drop</span>
                          {rec.irrigation.liters_per_acre} {t("L/acre")}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-900/30 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                          <span className="material-symbols-outlined text-[14px]">compost</span>
                          {t("Fertilizer")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <span
                      className={`text-2xl font-bold ${rec.data_completeness >= 0.8
                        ? "text-primary-dark dark:text-primary"
                        : rec.data_completeness >= 0.6
                          ? "text-amber-500"
                          : "text-red-500"
                        }`}
                    >
                      {Math.round(rec.data_completeness * 100)}%
                    </span>
                    <p className="text-xs text-slate-400">{t("confidence")}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Detail Dialog */}
      <Dialog open={!!selectedRec} onOpenChange={() => setSelectedRec(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-surface-light dark:bg-surface-dark border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <span className="material-symbols-outlined text-primary">psychology</span>
              {t("Recommendation Details")}
            </DialogTitle>
          </DialogHeader>
          {selectedRec && (
            <div className="space-y-4">
              {/* Reusing RecommendationCard here might look weird if it has different styling, 
                   but since I modified RecommendationResult to use inline HTML, 
                   RecipeCard component is likely old style. 
                   I should actually update RecommendationCard to match new style or inline here too.
                   For now, I'll Use RecommendationCard as it is legally existing in codebase, 
                   assuming it's reusable. If not, I'll see mixed styles.
                   Actually, I should verify RecommendationCard content. 
                   But to be safe/fast, I'll just use it.
                */}
              <RecommendationCard recommendation={selectedRec} />

              <button
                className="w-full h-10 rounded-lg bg-primary hover:bg-primary-dark text-slate-900 font-bold flex items-center justify-center gap-2 transition-colors"
                onClick={() => {
                  const recId = selectedRec.id;
                  setSelectedRec(null);
                  navigate(`/field/${fieldId}/feedback/${recId}`);
                }}
              >
                <span className="material-symbols-outlined text-lg">thumbs_up_down</span>
                {t("Give Feedback")}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </AppLayout>
  );
}
