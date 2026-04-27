import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LocationPicker } from "@/components/LocationPicker";
import { CropSelect } from "@/components/CropSelect";
import { fieldsApi } from "@/lib/api";
import { storage } from "@/lib/storage";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { toast } from "sonner";

const GROWTH_STAGES = [
  "Seedling",
  "Vegetative",
  "Flowering",
  "Fruiting",
  "Mature",
  "Harvest",
];

export default function CreateField() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const [name, setName] = useState("");
  const [crop, setCrop] = useState("");
  const [growthStage, setGrowthStage] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");

  const { farmerId } = useAuth();
  const { t } = useLanguage();

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

  return (
    <AppLayout>
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

    </AppLayout>
  );
}
