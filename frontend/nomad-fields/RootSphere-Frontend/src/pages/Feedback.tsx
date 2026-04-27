import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { feedbackApi } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppLayout } from "@/components/AppLayout";
import { toast } from "sonner";

type Outcome = "improved" | "no_change" | "worse";

export default function Feedback() {
  const { fieldId, recommendationId } = useParams<{
    fieldId: string;
    recommendationId: string;
  }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [followed, setFollowed] = useState<boolean | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [notes, setNotes] = useState("");

  const handleSubmit = async () => {
    if (!fieldId || !recommendationId || followed === null || !outcome) return;

    setIsLoading(true);

    try {
      await feedbackApi.submit({
        field_id: fieldId,
        recommendation_id: recommendationId,
        followed,
        outcome,
        notes: notes.trim() || undefined,
      });
      setIsSuccess(true);
      toast.success(t("Thank you for your feedback!"));
    } catch (err) {
      toast.error(t("Failed to submit feedback. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto mb-6 flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-primary">check_circle</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {t("Feedback Submitted!")}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8">
            {t("Your feedback helps improve future recommendations")}
          </p>
          <Button
            className="bg-primary hover:bg-primary-dark text-slate-900 font-bold"
            onClick={() => navigate(`/field/${fieldId}`)}
          >
            {t("Back to Field")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AppLayout outerClassName="pb-28 md:pb-20">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6 w-full">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-2">
          <Link
            to={`/field/${fieldId}`}
            className="p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">{t("Submit Feedback")}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t("Help improve recommendations")}</p>
          </div>
        </div>

        {/* Did you follow? */}
        <Card className="p-6 border-slate-200 dark:border-slate-800 bg-surface-light dark:bg-surface-dark">
          <Label className="text-base font-bold text-slate-900 dark:text-white mb-4 block">
            {t("Did you follow this recommendation?")}
          </Label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setFollowed(true)}
              className={`h-20 flex flex-col items-center justify-center gap-2 rounded-xl border-2 transition-all ${followed === true
                  ? "bg-primary/10 border-primary text-primary dark:bg-primary/20"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-primary/50"
                }`}
            >
              <span className="material-symbols-outlined text-3xl">check_circle</span>
              <span className="font-medium">{t("Yes")}</span>
            </button>
            <button
              onClick={() => setFollowed(false)}
              className={`h-20 flex flex-col items-center justify-center gap-2 rounded-xl border-2 transition-all ${followed === false
                  ? "bg-red-50 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-400"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-red-300 dark:hover:border-red-800"
                }`}
            >
              <span className="material-symbols-outlined text-3xl">cancel</span>
              <span className="font-medium">{t("No")}</span>
            </button>
          </div>
        </Card>

        {/* Outcome */}
        <Card className="p-6 border-slate-200 dark:border-slate-800 bg-surface-light dark:bg-surface-dark">
          <Label className="text-base font-bold text-slate-900 dark:text-white mb-4 block">
            {t("What was the outcome?")}
          </Label>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setOutcome("improved")}
              className={`h-24 flex flex-col items-center justify-center gap-2 rounded-xl border-2 transition-all ${outcome === "improved"
                  ? "bg-primary/10 border-primary text-primary dark:bg-primary/20"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-primary/50"
                }`}
            >
              <span className="material-symbols-outlined text-3xl">trending_up</span>
              <span className="text-sm font-medium">{t("Improved")}</span>
            </button>
            <button
              onClick={() => setOutcome("no_change")}
              className={`h-24 flex flex-col items-center justify-center gap-2 rounded-xl border-2 transition-all ${outcome === "no_change"
                  ? "bg-amber-50 dark:bg-amber-900/20 border-amber-500 text-amber-700 dark:text-amber-400"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-300 dark:hover:border-amber-800"
                }`}
            >
              <span className="material-symbols-outlined text-3xl">remove</span>
              <span className="text-sm font-medium">{t("No Change")}</span>
            </button>
            <button
              onClick={() => setOutcome("worse")}
              className={`h-24 flex flex-col items-center justify-center gap-2 rounded-xl border-2 transition-all ${outcome === "worse"
                  ? "bg-red-50 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-400"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-red-300 dark:hover:border-red-800"
                }`}
            >
              <span className="material-symbols-outlined text-3xl">trending_down</span>
              <span className="text-sm font-medium">{t("Worse")}</span>
            </button>
          </div>
        </Card>

        {/* Notes */}
        <Card className="p-6 border-slate-200 dark:border-slate-800 bg-surface-light dark:bg-surface-dark">
          <Label
            htmlFor="notes"
            className="text-base font-bold text-slate-900 dark:text-white mb-4 block"
          >
            {t("Additional Notes (Optional)")}
          </Label>
          <Textarea
            id="notes"
            placeholder={t("Any observations or comments about the recommendation...")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="resize-none bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-primary/40 focus:border-primary text-slate-900 dark:text-white placeholder:text-slate-400"
          />
        </Card>
      </main>

      {/* Fixed Submit Button */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 bg-surface-light dark:bg-surface-dark border-t border-slate-200 dark:border-slate-800 p-4 z-40">
        <div className="max-w-2xl mx-auto">
          <Button
            className="w-full h-12 bg-primary hover:bg-primary-dark text-slate-900 font-bold"
            onClick={handleSubmit}
            disabled={followed === null || !outcome || isLoading}
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined text-xl mr-2 animate-spin">progress_activity</span>
                {t("Submitting...")}
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-xl mr-2">send</span>
                {t("Submit Feedback")}
              </>
            )}
          </Button>
        </div>
      </div>

    </AppLayout>
  );
}
