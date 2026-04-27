import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { ThemeToggle } from "./ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { LANG_OPTIONS } from "@/constants/languages";

type ActiveTab = "dashboard" | "fields" | "sensors" | null;

function getActiveTab(path: string): ActiveTab {
  if (path === "/dashboard") return "dashboard";
  if (
    path === "/fields" ||
    path.startsWith("/fields/") ||
    path.startsWith("/field/")
  ) {
    return "fields";
  }
  if (path === "/sensors" || path.startsWith("/sensors/")) return "sensors";
  return null;
}

interface NavItemProps {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}

function DesktopNavItem({ icon, label, active, onClick }: NavItemProps) {
  const stateClasses = active
    ? "bg-slate-100 dark:bg-slate-800 text-primary"
    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary";
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${stateClasses}`}
    >
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
      {label}
    </button>
  );
}

function MobileNavItem({ icon, label, active, onClick }: NavItemProps) {
  const stateClasses = active
    ? "text-primary"
    : "text-slate-500 dark:text-slate-400 hover:text-primary";
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 transition-colors ${stateClasses}`}
    >
      <span className="material-symbols-outlined text-[22px]">{icon}</span>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

interface AppLayoutProps {
  children: ReactNode;
  /** Override the outer container's bottom padding (default: pb-16 md:pb-0 for mobile bottom nav). */
  outerClassName?: string;
}

export function AppLayout({
  children,
  outerClassName = "pb-16 md:pb-0",
}: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { farmerName, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const activeTab = getActiveTab(location.pathname);
  const initial =
    farmerName && farmerName.length > 0
      ? farmerName.charAt(0).toUpperCase()
      : "F";

  return (
    <div
      className={`bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col overflow-x-hidden ${outerClassName}`}
    >
      <header className="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-slate-800 bg-surface-light dark:bg-surface-dark px-6 py-3 shadow-sm">
        <Link
          to="/dashboard"
          className="flex items-center gap-4 cursor-pointer"
          aria-label="RootSphere AI home"
        >
          <div className="size-8 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined !text-[32px]">spa</span>
          </div>
          <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">
            RootSphere AI
          </h2>
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-6">
          <DesktopNavItem
            icon="dashboard"
            label={t("Dashboard")}
            active={activeTab === "dashboard"}
            onClick={() => navigate("/dashboard")}
          />
          <DesktopNavItem
            icon="spa"
            label={t("Fields")}
            active={activeTab === "fields"}
            onClick={() => navigate("/fields")}
          />
          <DesktopNavItem
            icon="sensors"
            label={t("Sensors")}
            active={activeTab === "sensors"}
            onClick={() => navigate("/sensors")}
          />
        </nav>

        <div className="hidden md:flex flex-1 items-center justify-end gap-6">
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 outline-none"
                  aria-label="Change language"
                >
                  <span className="material-symbols-outlined">translate</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-40 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              >
                {LANG_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.code}
                    onClick={() => setLanguage(opt.code)}
                    className={`cursor-pointer ${
                      language === opt.code
                        ? "text-primary font-bold bg-slate-50 dark:bg-slate-700/50"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              onClick={logout}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label={t("Logout")}
            >
              <span className="material-symbols-outlined">logout</span>
            </button>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
            <Link
              to="/profile"
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                {initial}
              </div>
              <span className="text-sm font-medium hidden xl:block text-slate-800 dark:text-white">
                {farmerName}
              </span>
            </Link>
          </div>
        </div>
      </header>

      {children}

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-surface-dark border-t border-slate-200 dark:border-slate-800 h-16 flex items-center justify-around px-4 z-50">
        <MobileNavItem
          icon="dashboard"
          label={t("Dashboard")}
          active={activeTab === "dashboard"}
          onClick={() => navigate("/dashboard")}
        />
        <MobileNavItem
          icon="spa"
          label={t("Fields")}
          active={activeTab === "fields"}
          onClick={() => navigate("/fields")}
        />
        <MobileNavItem
          icon="sensors"
          label={t("Sensors")}
          active={activeTab === "sensors"}
          onClick={() => navigate("/sensors")}
        />
      </div>
    </div>
  );
}
