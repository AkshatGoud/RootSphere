import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { LocationPicker } from '@/components/LocationPicker';
import { CropSelect } from '@/components/CropSelect';
import { fieldsApi } from '@/lib/api';
import type { Field } from '@/types/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const GROWTH_STAGES = [
  "Seedling",
  "Vegetative",
  "Flowering",
  "Fruiting",
  "Mature",
  "Harvest",
];

interface EditFieldDialogProps {
  field: Field;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditFieldDialog({ field, open, onOpenChange, onSuccess }: EditFieldDialogProps) {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(field.name);
  const [crop, setCrop] = useState(field.crop);
  const [stage, setStage] = useState(field.growth_stage);

  // Location state
  const [lat, setLat] = useState<number>(field.lat);
  const [lon, setLon] = useState<number>(field.lon);

  // Reset form when field changes or dialog opens
  useEffect(() => {
    if (open) {
      setName(field.name);
      setCrop(field.crop);
      setStage(field.growth_stage);
      setLat(field.lat);
      setLon(field.lon);
    }
  }, [field, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !crop.trim() || !stage.trim()) return;

    setIsLoading(true);
    try {
      await fieldsApi.update(field.id, {
        name: name.trim(),
        crop: crop.trim(),
        growth_stage: stage.trim(),
        lat,
        lon
      });

      toast.success(t('Field updated successfully'));
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error(t('Failed to update field'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:max-h-[85vh] bg-surface-light dark:bg-surface-dark border-slate-200 dark:border-slate-800">
        {/* Fix 17: Dialog header icon */}
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <span className="material-symbols-outlined text-2xl text-primary">edit_square</span>
          </div>
          <DialogTitle className="text-center text-slate-900 dark:text-white text-xl">{t("Edit Field")}</DialogTitle>
          <DialogDescription className="text-center text-slate-500 dark:text-slate-400">
            {t("Update field details. Changing location will refresh weather data.")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="grid gap-5">
            {/* Fix 15: Styled input with icon matching CreateField */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold text-slate-900 dark:text-white">
                {t("Field Name")}
              </Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-primary">
                  <span className="material-symbols-outlined text-xl">edit</span>
                </span>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder={t("e.g. North Field, Plot A1")}
                  className="w-full pl-11 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg h-12 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="crop" className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t("Crop")}
                </Label>
                <CropSelect
                    value={crop}
                    onValueChange={setCrop}
                    required
                />
              </div>
            </div>

            {/* Fix 13: Growth stage chips instead of free-text input */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-900 dark:text-white">
                {t("Growth Stage")}
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {GROWTH_STAGES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStage(s)}
                    className={`py-3 px-4 rounded-lg border text-sm font-bold transition-all ${
                      stage.toLowerCase() === s.toLowerCase()
                        ? "bg-green-50 dark:bg-green-900/20 border-primary text-primary shadow-sm"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    {t(s)}
                  </button>
                ))}
              </div>
            </div>

            {/* Fix 16: Location picker styling */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-900 dark:text-white">
                {t("Location")}
              </Label>
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                <LocationPicker
                    initialLocation={{ lat, lon }}
                    onLocationSelect={(loc) => {
                        setLat(loc.lat);
                        setLon(loc.lon);
                    }}
                />
              </div>
              <div className="flex items-center gap-2 mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-900/50">
                <span className="material-symbols-outlined text-primary text-lg">location_on</span>
                <span className="text-sm text-slate-900 dark:text-white font-medium">
                  {t("Lat:")} {lat.toFixed(4)}, {t("Lon:")} {lon.toFixed(4)}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="border-slate-300 dark:border-slate-600"
            >
              {t("Cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-primary hover:bg-primary-dark text-slate-900 font-bold shadow-sm"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("Save Changes")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
