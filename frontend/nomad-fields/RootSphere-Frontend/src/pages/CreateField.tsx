import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LocationPicker } from "@/components/LocationPicker";
import { CropSelect } from "@/components/CropSelect";
import { fieldsApi } from "@/lib/api";
import { storage } from "@/lib/storage";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";

const GROWTH_STAGES = [
  "Seedling",
  "Vegetative",
  "Flowering",
  "Fruiting",
  "Mature",
  "Harvest",
];

const LANG_OPTIONS = [
  { code: "en" as const, label: "🇺🇸 English" },
  { code: "hi" as const, label: "🇮🇳 हिंदी" },
  { code: "te" as const, label: "🇮🇳 తెలుగు" },
  { code: "ta" as const, label: "🇮🇳 தமிழ்" },
];

export default function CreateField() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const [name, setName] = useState("");
  const [crop, setCrop] = useState("");
  const [growthStage, setGrowthStage] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");

  const farmerId = storage.getFarmerId();
  const farmerName = localStorage.getItem("farmer_name") || "Farmer";
  const { language, setLanguage, t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmerId || !name.trim() || !crop.trim() || !growthStage.trim()) return;

    setIsLoading(true);

    try {
      const field = await fieldsApi.create({
        farmer_id: farmerId,
        name: name.trim(),
        crop: crop.trim(),
        growth_stage: growthStage.trim(),
        lat: lat ? parseFloat(lat) : 0.0,
        lon: lon ? parseFloat(lon) : 0.0,
      });
      storage.setLastFieldId(field.id);
      toast.success(t("Field created successfully!"));
      navigate(`/field/${field.id}`);
    } catch (err) {
      toast.error(t("Failed to create field. Please try again."));
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
          <button onClick={() => navigate('/fields')} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-800 text-primary transition-colors flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[20px]">spa</span>
            {t('Fields')}
          </button>
          <button onClick={() => navigate('/sensors')} className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary transition-colors flex items-center gap-1.5">
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
          <Link
            to="/dashboard"
            className="hover:text-primary transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[18px]">
              dashboard
            </span>
            {t('Dashboard')}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-slate-900 dark:text-white font-semibold">
            {t('Add Field')}
          </span>
        </nav>

        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl mb-2">
            {t('Create New Field')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            {t('Enter details about your field to start monitoring.')}
          </p>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Field Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-semibold text-slate-900 dark:text-white mb-2"
              >
                {t('Field Name')} *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-primary">
                  <span className="material-symbols-outlined text-xl">edit</span>
                </span>
                <input
                  id="name"
                  type="text"
                  placeholder={t("e.g. North Field, Plot A1")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full pl-11 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg h-12 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Crop Type */}
            <div>
              <label
                htmlFor="crop"
                className="block text-sm font-semibold text-slate-900 dark:text-white mb-2"
              >
                {t('Crop Type')} *
              </label>
              {/* Note: keeping CropSelect functionality but wrapping? 
                  For now using the component but I might need to style it inside to match.
                  Actually, CropSelect uses Shadcn Select. It might look out of place.
                  I'll use a standard Select for now to match the HTML style more likely if I could.
                  But preserving functionality is key. I'll stick with CropSelect and hope Shadcn styles mesh ok-ish,
                  or I'll wrap it.
                  Actually, let's just use the CropSelect as is, it might need styling tweaks in global css or just accept it's a select.
              */}
              <CropSelect value={crop} onValueChange={setCrop} required />
            </div>

            {/* Growth Stage */}
            <div>
              <label
                className="block text-sm font-semibold text-slate-900 dark:text-white mb-2"
              >
                {t('Growth Stage')} *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {GROWTH_STAGES.map((stage) => (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => setGrowthStage(stage)}
                    className={`py-3 px-4 rounded-lg border text-sm font-bold transition-all ${growthStage === stage
                        ? "bg-green-50 dark:bg-green-900/20 border-primary text-primary shadow-sm"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-700"
                      }`}
                  >
                    {t(stage)}
                  </button>
                ))}
              </div>
            </div>

            {/* Location Picker */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                {t('Field Location')}
              </label>
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                <LocationPicker
                  onLocationSelect={(loc) => {
                    setLat(loc.lat.toString());
                    setLon(loc.lon.toString());
                  }}
                />
              </div>
              {(lat || lon) && (
                <div className="flex items-center gap-2 mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-900/50">
                  <span className="material-symbols-outlined text-primary text-lg">location_on</span>
                  <span className="text-sm text-slate-900 dark:text-white font-medium">
                    {lat ? parseFloat(lat).toFixed(4) : "—"}, {lon ? parseFloat(lon).toFixed(4) : "—"}
                  </span>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={!name.trim() || !crop.trim() || !growthStage.trim() || isLoading}
                className="w-full bg-primary hover:bg-primary-dark text-slate-900 h-12 rounded-lg font-bold text-base shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                    {t('Creating Field...')}
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-xl">add</span>
                    {t('Create Field')}
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
        <button onClick={() => navigate('/fields')} className="flex flex-col items-center justify-center gap-1 text-primary transition-colors">
          <span className="material-symbols-outlined text-[22px]">spa</span>
          <span className="text-xs font-medium">{t('Fields')}</span>
        </button>
        <button onClick={() => navigate('/sensors')} className="flex flex-col items-center justify-center gap-1 text-slate-500 dark:text-slate-400 hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-[22px]">sensors</span>
          <span className="text-xs font-medium">{t('Sensors')}</span>
        </button>
      </div>
    </div>
  );
}
