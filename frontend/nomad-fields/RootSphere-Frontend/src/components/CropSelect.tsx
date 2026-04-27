import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CropSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  required?: boolean;
}

import { useLanguage } from "@/contexts/LanguageContext";

export function CropSelect({ value, onValueChange, required }: CropSelectProps) {
  const { t } = useLanguage();
  const crops = [
    {
      value: "Rice",
      label: "Paddy (Rice)",
    },
    {
      value: "Cotton",
      label: "Cotton",
    },
    {
      value: "Groundnut",
      label: "Groundnut (Peanut)",
    },
    {
      value: "Sorghum",
      label: "Cholam (Sorghum)",
    }
  ];

  return (
    <Select value={value} onValueChange={onValueChange} required={required}>
      <SelectTrigger className="h-12 w-full">
        <SelectValue placeholder={t("Select a crop...")} />
      </SelectTrigger>
      <SelectContent className="z-[9999]">
        {crops.map((crop) => (
          <SelectItem key={crop.value} value={crop.value} className="py-3">
            <div className="flex flex-col items-start text-left">
              <span className="font-medium">{t(crop.label)}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
