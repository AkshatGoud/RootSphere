export const GROWTH_STAGE_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  seedling: {
    bg: "bg-green-50 dark:bg-green-900/20",
    text: "text-green-700 dark:text-green-400",
    border: "border-green-200 dark:border-green-800",
  },
  vegetative: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
  },
  flowering: {
    bg: "bg-purple-50 dark:bg-purple-900/20",
    text: "text-purple-700 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-800",
  },
  fruiting: {
    bg: "bg-rose-50 dark:bg-rose-900/20",
    text: "text-rose-700 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-800",
  },
  harvest: {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
  },
  mature: {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-700 dark:text-slate-400",
    border: "border-slate-300 dark:border-slate-700",
  },
};

export const CROP_ICONS: Record<string, string> = {
  rice: "rice_bowl",
  wheat: "grain",
  cotton: "filter_vintage",
  maize: "grass",
  groundnut: "spa",
  sorghum: "grain",
};

export const GROWTH_STAGES_ORDER = [
  "seedling",
  "vegetative",
  "flowering",
  "fruiting",
  "mature",
  "harvest",
] as const;

export const getStageColors = (stage: string) =>
  GROWTH_STAGE_COLORS[stage.toLowerCase()] || GROWTH_STAGE_COLORS.seedling;

export const getCropIcon = (crop: string) =>
  CROP_ICONS[crop.toLowerCase()] || "agriculture";
