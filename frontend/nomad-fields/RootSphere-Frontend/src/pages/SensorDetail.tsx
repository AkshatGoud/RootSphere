import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sensorsApi, fieldsApi } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import type { Sensor, Field } from "@/types/api";
import { toast } from "sonner";

const ONBOARDING_STEPS = [
  { key: 'register', icon: 'add_circle', label: 'Register' },
  { key: 'assign', icon: 'link', label: 'Assign to Field' },
  { key: 'ready', icon: 'check_circle', label: 'Ready' },
];

export default function SensorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const justCreated = (location.state as any)?.justCreated === true;
  const autoAssignTriggered = useRef(false);

  const [sensor, setSensor] = useState<Sensor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [setupComplete, setSetupComplete] = useState(false);
  const { farmerId } = useAuth();
  const { t } = useLanguage();

  // Assignment State
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedField, setSelectedField] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);

  // Simulation State
  const [isSimulating, setIsSimulating] = useState(false);

  // Delete State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (id) loadSensor();
  }, [id]);

  // Auto-open assign dialog when arriving from sensor creation
  useEffect(() => {
    if (justCreated && sensor && !sensor.current_assignment && !autoAssignTriggered.current) {
      autoAssignTriggered.current = true;
      // Clear the location state so refresh doesn't re-trigger
      window.history.replaceState({}, document.title);
      handleOpenAssign();
    }
  }, [justCreated, sensor]);

  const loadSensor = async () => {
    if (!id) return;
    try {
      const data = await sensorsApi.get(id);
      setSensor(data);
    } catch (error) {
      toast.error(t("Failed to load sensor"));
      navigate("/sensors");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAssign = async () => {
    if (!farmerId) return;

    try {
      const fieldList = await fieldsApi.getByFarmer(farmerId);
      setFields(fieldList);
      setIsAssignOpen(true);
    } catch (e) {
      toast.error(t("Failed to load fields"));
    }
  };

  const handleAssign = async () => {
    if (!id || !selectedField) return;
    setIsAssigning(true);
    try {
      await sensorsApi.assign(id, {
        sensor_id: id,
        field_id: selectedField,
        notes: "Assigned via App",
      });
      toast.success(t("Sensor assigned successfully!"));
      setIsAssignOpen(false);
      setSetupComplete(true);
      // Auto-dismiss the celebration after 3 seconds
      setTimeout(() => setSetupComplete(false), 3000);
      loadSensor();
    } catch (e) {
      toast.error(t("Failed to assign sensor"));
    } finally {
      setIsAssigning(false);
    }
  };

  const handleSimulate = async () => {
    if (!id) return;
    setIsSimulating(true);
    try {
      const reading = await sensorsApi.simulate(id);
      toast.success(`${t("Simulated Data: Moisture")} ${reading.moisture.toFixed(1)}%`);
    } catch (e) {
      toast.error(t("Simulation failed. Is the sensor assigned?"));
    } finally {
      setIsSimulating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
      case "draft":
        return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700";
      case "inactive":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
      default:
        return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700";
    }
  };

  const getIconForType = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('weather')) return 'device_thermostat';
    if (t.includes('soil')) return 'water_drop';
    return 'sensors';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark font-display flex flex-col items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin mb-4">sensors</span>
        <p className="text-slate-500">{t("Loading sensor details...")}</p>
      </div>
    );
  }

  if (!sensor) return null; // Should redirect in loadSensor error

  return (
    <AppLayout>
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          <span className="text-slate-900 dark:text-white font-semibold">{sensor.name}</span>
        </nav>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary-dark dark:text-primary">
              <span className="material-symbols-outlined text-4xl">{getIconForType(sensor.type)}</span>
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl mb-1">
                {sensor.name}
              </h1>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide border ${getStatusColor(sensor.status)}`}>
                  {sensor.status}
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                  {sensor.type} {t("Device")}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsDeleteOpen(true)}
            className="group flex items-center justify-center gap-2 border border-red-200 dark:border-red-900/50 text-red-500 dark:text-red-400 px-4 py-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">delete_forever</span>
            <span className="font-semibold text-sm">{t('Delete')}</span>
          </button>
        </div>

        {/* Setup Complete Celebration */}
        {setupComplete && (
          <div className="mb-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5 flex items-center gap-4 animate-fade-in">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-2xl text-emerald-600 dark:text-emerald-400">celebration</span>
            </div>
            <div>
              <h3 className="font-bold text-emerald-800 dark:text-emerald-300">{t('Setup Complete!')}</h3>
              <p className="text-sm text-emerald-700 dark:text-emerald-400">{t('Your sensor is now active and connected. Try simulating data to test the integration.')}</p>
            </div>
          </div>
        )}

        {/* Onboarding Stepper — show for new/unassigned sensors */}
        {(!sensor.current_assignment || setupComplete) && (
          <div className="mb-6 bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
            <div className="flex items-center justify-between gap-2">
              {ONBOARDING_STEPS.map((step, idx) => {
                const isAssigned = !!sensor.current_assignment;
                let stepStatus: 'done' | 'active' | 'pending' = 'pending';
                if (step.key === 'register') stepStatus = 'done';
                else if (step.key === 'assign') stepStatus = isAssigned ? 'done' : 'active';
                else if (step.key === 'ready') stepStatus = isAssigned ? 'done' : 'pending';

                return (
                  <div key={step.key} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                        stepStatus === 'done'
                          ? 'bg-primary/20 border-primary text-primary'
                          : stepStatus === 'active'
                          ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-400 text-amber-600 dark:text-amber-400 ring-2 ring-amber-200 dark:ring-amber-800'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                      }`}>
                        {stepStatus === 'done' ? (
                          <span className="material-symbols-outlined text-[18px]">check</span>
                        ) : (
                          <span className="material-symbols-outlined text-[18px]">{step.icon}</span>
                        )}
                      </div>
                      <span className={`text-[11px] mt-1.5 font-medium text-center ${
                        stepStatus === 'done' ? 'text-primary font-bold' : stepStatus === 'active' ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-400'
                      }`}>
                        {t(step.label)}
                      </span>
                    </div>
                    {idx < ONBOARDING_STEPS.length - 1 && (
                      <div className={`h-0.5 w-full min-w-[16px] mx-1 rounded-full mt-[-16px] ${
                        stepStatus === 'done' ? 'bg-primary/40' : 'bg-slate-200 dark:bg-slate-700'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status & Metrics Card */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 text-lg">
              <span className="material-symbols-outlined text-primary">info</span>
              {t("Device Information")}
            </h3>

            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">{t("Metrics Monitored")}</label>
                <div className="flex flex-wrap gap-2">
                  {sensor.metrics.split(",").map((m) => (
                    <span
                      key={m}
                      className="inline-flex items-center px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium border border-slate-200 dark:border-slate-700"
                    >
                      {m.trim()}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <label className="text-xs text-slate-400 mb-1 block">{t("Connection Status")}</label>
                  <div className="flex items-center gap-2 text-emerald-600 font-bold">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    {t("Online")}
                  </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <label className="text-xs text-slate-400 mb-1 block">{t("Last Sync")}</label>
                  <div className="text-slate-700 dark:text-slate-300 font-bold">
                    {t("Just now")}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Assignment Section */}
          <div className="space-y-6">
            {/* Assignment Card */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 h-fit">
              <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 text-lg">
                <span className="material-symbols-outlined text-primary">location_on</span>
                {t("Field Assignment")}
              </h3>

              {sensor.current_assignment ? (
                <div className="space-y-4">
                  <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 mb-2">
                      <span className="material-symbols-outlined">check_circle</span>
                      <span className="font-bold text-sm uppercase tracking-wide">{t("Currently Active")}</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mb-1">
                      {sensor.current_assignment.field_name || t("Unknown Field")}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {t("Started")}: {new Date(sensor.current_assignment.started_at).toLocaleDateString()}
                    </p>
                  </div>

                  <button
                    onClick={handleOpenAssign}
                    className="w-full py-3 rounded-lg border border-slate-300 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">move_location</span>
                    {t("Re-Assign / Move")}
                  </button>
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                  <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600 dark:text-amber-400">
                    <span className="material-symbols-outlined text-3xl">link_off</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 mb-6 font-medium">
                    {t("Device is not installed in any field.")}
                  </p>
                  <button
                    onClick={handleOpenAssign}
                    className="bg-primary hover:bg-primary-dark text-slate-900 font-bold px-6 py-2.5 rounded-lg shadow-sm transition-all flex items-center gap-2 mx-auto"
                  >
                    <span className="material-symbols-outlined">add_link</span>
                    {t("Assign to Field")}
                  </button>
                </div>
              )}
            </div>

            {/* Simulation Card */}
            {sensor.current_assignment && (
              <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 text-lg">
                  <span className="material-symbols-outlined text-purple-500">science</span>
                  {t("Simulation")}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  {t("Generate dummy sensor readings to test the system integration and AI recommendations.")}
                </p>
                <button
                  onClick={handleSimulate}
                  disabled={isSimulating}
                  className="w-full bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isSimulating ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">progress_activity</span>
                      {t("Simulating...")}
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">play_arrow</span>
                      {t("Simulate Data Points")}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Assignment Dialog */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="max-w-md bg-surface-light dark:bg-surface-dark border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <span className="material-symbols-outlined text-primary">location_on</span>
              {t("Assign Sensor")}
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              {t("Select a field to install this sensor. Previous assignments will be closed.")}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <label className="text-sm font-bold text-slate-900 dark:text-white block mb-2">{t("Select Field")}</label>
            <Select value={selectedField} onValueChange={setSelectedField}>
              <SelectTrigger className="h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                <SelectValue placeholder={t("Choose field...")} />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                {fields.map((f) => (
                  <SelectItem key={f.id} value={f.id} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 focus:bg-slate-100 dark:focus:bg-slate-700">
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignOpen(false)} className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300">
              {t("Cancel")}
            </Button>
            <Button
              className="bg-primary hover:bg-primary-dark text-slate-900 font-bold"
              onClick={handleAssign}
              disabled={!selectedField || isAssigning}
            >
              {isAssigning ? t("Assigning...") : t("Confirm Assignment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Sensor Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={(open) => !open && setIsDeleteOpen(false)}>
        <DialogContent className="max-w-md bg-surface-light dark:bg-surface-dark border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <div className="mx-auto w-14 h-14 bg-red-100 dark:bg-red-950/50 rounded-full flex items-center justify-center mb-2">
              <span className="material-symbols-outlined text-3xl text-red-500">warning</span>
            </div>
            <DialogTitle className="text-center text-slate-900 dark:text-white text-xl">
              {t('Delete this sensor?')}
            </DialogTitle>
            <DialogDescription className="text-center text-slate-500 dark:text-slate-400 pt-2">
              {t('This will permanently delete')} <span className="font-semibold text-slate-700 dark:text-slate-300">{sensor.name}</span> {t('and all its assignments and readings. This cannot be undone.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isDeleting}
              className="flex-1 border-slate-300 dark:border-slate-600"
            >
              {t('Cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={isDeleting}
              className="flex-1"
              onClick={async () => {
                if (!id) return;
                setIsDeleting(true);
                try {
                  await sensorsApi.delete(id);
                  toast.success(t("Sensor deleted successfully"));
                  navigate('/sensors');
                } catch (error: any) {
                  toast.error(error?.message || t("Failed to delete sensor"));
                  setIsDeleting(false);
                  setIsDeleteOpen(false);
                }
              }}
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                  {t('Deleting...')}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">delete_forever</span>
                  {t('Delete Sensor')}
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AppLayout>
  );
}
