import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { sensorsApi } from "@/lib/api";
import { storage } from "@/lib/storage";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";

const SENSOR_TYPES = [
  { value: "Soil", label: "Soil Sensor", description: "Moisture, pH, NPK", icon: "water_drop" },
  { value: "Weather", label: "Weather Station", description: "Temp, Humidity, Wind", icon: "device_thermostat" },
  { value: "Other", label: "Other Device", description: "Custom metrics", icon: "sensors" },
];

const LANG_OPTIONS = [
  { code: "en" as const, label: "🇺🇸 English" },
  { code: "hi" as const, label: "🇮🇳 हिंदी" },
  { code: "te" as const, label: "🇮🇳 తెలుగు" },
  { code: "ta" as const, label: "🇮🇳 தமிழ்" },
];

export default function AddSensor() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState("Soil");
  const [metrics, setMetrics] = useState("moisture,ph,n,p,k");
  const [notes, setNotes] = useState("");

  const farmerName = localStorage.getItem("farmer_name") || "Farmer";
  const { language, setLanguage, t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      const created = await sensorsApi.create({
        name: name.trim(),
        type,
        metrics: metrics.trim(),
        status: "draft",
        notes: notes.trim(),
      });
      toast.success(t("Sensor created successfully"));
      navigate(`/sensors/${created.id}`, { state: { justCreated: true } });
    } catch (error) {
      console.error(error);
      toast.error(t("Failed to create sensor"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    storage.clearAll();
    localStorage.removeItem("access_token");
    localStorage.removeItem("farmer_name");
    navigate("/");
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col overflow-x-hidden pb-16 md:pb-0">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-slate-800 bg-surface-light dark:bg-surface-dark px-6 py-3 shadow-sm">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="size-8 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined !text-[32px]">spa</span>
          </div>
          <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">
            RootSphere AI
          </h2>
        </div>
        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-1 ml-6">
          <button onClick={() => navigate('/dashboard')} className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary transition-colors flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            {t('Dashboard')}
          </button>
          <button onClick={() => navigate('/fields')} className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary transition-colors flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[20px]">spa</span>
            {t('Fields')}
          </button>
          <button onClick={() => navigate('/sensors')} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-800 text-primary transition-colors flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[20px]">sensors</span>
            {t('Sensors')}
          </button>
        </nav>
        <div className="hidden md:flex flex-1 items-center justify-end gap-6">
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {/* Language Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 outline-none">
                  <span className="material-symbols-outlined">translate</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                {LANG_OPTIONS.map(opt => (
                  <DropdownMenuItem
                    key={opt.code}
                    onClick={() => setLanguage(opt.code)}
                    className={`cursor-pointer ${
                      language === opt.code ? 'text-primary font-bold bg-slate-50 dark:bg-slate-700/50' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <span className="material-symbols-outlined">logout</span>
            </button>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
            <Link to="/profile" className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                {(farmerName && farmerName.length > 0) ? farmerName.charAt(0).toUpperCase() : "F"}
              </div>
              <span className="text-sm font-medium hidden xl:block text-slate-800 dark:text-white">
                {farmerName}
              </span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <nav className="flex mb-6 text-sm font-medium text-slate-500 dark:text-slate-400">
          <Link to="/dashboard" className="hover:text-primary transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[18px]">dashboard</span>
            {t("Dashboard")}
          </Link>
          <span className="mx-2">/</span>
          <Link to="/sensors" className="hover:text-primary transition-colors">
            {t("Sensor Registry")}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-slate-900 dark:text-white font-semibold">{t("New Device")}</span>
        </nav>

        <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Header */}
          <div className="p-8 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary-dark dark:text-primary">
                <span className="material-symbols-outlined text-3xl">add_circle</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t("Register New Device")}</h2>
                <p className="text-slate-500 dark:text-slate-400">
                  {t("Add a sensor to start monitoring your fields")}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* Sensor Name */}
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-bold text-slate-900 dark:text-white">
                {t("Sensor Name / ID")}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-primary">
                  <span className="material-symbols-outlined text-xl">fingerprint</span>
                </span>
                <input
                  id="name"
                  type="text"
                  placeholder={t("e.g. SN-2024-001")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full pl-11 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg h-12 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Device Type */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-slate-900 dark:text-white">
                {t("Device Type")}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {SENSOR_TYPES.map((sensorType) => (
                  <button
                    key={sensorType.value}
                    type="button"
                    onClick={() => setType(sensorType.value)}
                    className={`relative p-4 rounded-xl border-2 text-left transition-all ${type === sensorType.value
                        ? "bg-emerald-50 dark:bg-emerald-900/20 border-primary"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-800"
                      }`}
                  >
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full mb-3 ${type === sensorType.value
                        ? "bg-primary text-slate-900"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-500"
                      }`}>
                      <span className="material-symbols-outlined text-xl">{sensorType.icon}</span>
                    </div>
                    <h3 className={`font-bold mb-1 ${type === sensorType.value ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300"
                      }`}>
                      {t(sensorType.label)}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {t(sensorType.description)}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Metrics */}
            <div className="space-y-2">
              <label htmlFor="metrics" className="block text-sm font-bold text-slate-900 dark:text-white">
                {t("Metrics")}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-primary">
                  <span className="material-symbols-outlined text-xl">bar_chart</span>
                </span>
                <input
                  id="metrics"
                  value={metrics}
                  onChange={(e) => setMetrics(e.target.value)}
                  placeholder={t("moisture, temp, ph...")}
                  className="w-full pl-11 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg h-12 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-slate-400"
                />
              </div>
              <p className="text-xs text-slate-500 pl-1">
                {t("Comma separated values (e.g. moisture, temp)")}
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label htmlFor="notes" className="block text-sm font-bold text-slate-900 dark:text-white">
                {t("Notes (Optional)")}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-primary">
                  <span className="material-symbols-outlined text-xl">description</span>
                </span>
                <input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("Location details, MAC address...")}
                  className="w-full pl-11 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg h-12 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="pt-4 flex gap-4">
              <button
                type="button"
                onClick={() => navigate("/sensors")}
                className="flex-1 h-12 rounded-lg border border-slate-300 dark:border-slate-600 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {t("Cancel")}
              </button>
              <button
                type="submit"
                disabled={!name.trim() || isLoading}
                className="flex-[2] h-12 rounded-lg bg-primary hover:bg-primary-dark text-slate-900 font-bold shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span>
                    {t("Registering...")}
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-xl">check</span>
                    {t("Add Sensor")}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-surface-dark border-t border-slate-200 dark:border-slate-800 h-16 flex items-center justify-around px-4 z-50">
        <button onClick={() => navigate('/dashboard')} className="flex flex-col items-center justify-center gap-1 text-slate-500 dark:text-slate-400 hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-[22px]">dashboard</span>
          <span className="text-xs font-medium">{t('Dashboard')}</span>
        </button>
        <button onClick={() => navigate('/fields')} className="flex flex-col items-center justify-center gap-1 text-slate-500 dark:text-slate-400 hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-[22px]">spa</span>
          <span className="text-xs font-medium">{t('Fields')}</span>
        </button>
        <button onClick={() => navigate('/sensors')} className="flex flex-col items-center justify-center gap-1 text-primary transition-colors">
          <span className="material-symbols-outlined text-[22px]">sensors</span>
          <span className="text-xs font-medium">{t('Sensors')}</span>
        </button>
      </div>
    </div>
  );
}
