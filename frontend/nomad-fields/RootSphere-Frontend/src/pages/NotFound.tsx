import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { storage } from "@/lib/storage";

const NotFound = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const isLoggedIn = !!storage.getFarmerId() && !!localStorage.getItem("access_token");

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col">
      {/* Header */}
      <header className="bg-surface-light dark:bg-surface-dark border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center">
          <Link to={isLoggedIn ? "/dashboard" : "/"} className="flex items-center gap-4">
            <div className="size-8 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined !text-[32px]">spa</span>
            </div>
            <span className="font-bold text-slate-900 dark:text-white text-lg">RootSphere AI</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          {/* 404 Illustration */}
          <div className="relative mb-8">
            <div className="text-[120px] font-black text-slate-100 dark:text-slate-800 leading-none">
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-5xl text-primary">search</span>
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
            {t("pageNotFound")}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8">
            {t("pageNotFoundDescription")}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to={isLoggedIn ? "/dashboard" : "/"}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-slate-900 shadow-sm hover:bg-primary-dark transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">home</span>
              {isLoggedIn ? t("Dashboard") : t("goToHome")}
            </Link>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              {t("goBack")}
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">
        <p>&copy; 2026 RootSphere AI. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default NotFound;
