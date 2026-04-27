import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { sensorsApi } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppLayout } from "@/components/AppLayout";
import type { Sensor } from "@/types/api";
import { Skeleton } from "@/components/ui/skeleton";

const SENSOR_TYPE_ICONS: Record<string, { icon: string; bg: string; text: string }> = {
  soil: { icon: 'compost', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400' },
  weather: { icon: 'cloud', bg: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-600 dark:text-cyan-400' },
  other: { icon: 'settings_remote', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400' },
};

const STATUS_META: Record<string, { color: string; bg: string; dotColor: string }> = {
  active: { color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20", dotColor: "bg-emerald-500" },
  error: { color: "text-red-700 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20", dotColor: "bg-red-500" },
  draft: { color: "text-slate-500 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800", dotColor: "bg-slate-400" },
  maintenance: { color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20", dotColor: "bg-amber-500" },
  inactive: { color: "text-slate-500 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800", dotColor: "bg-slate-400" },
};

const getSensorTypeInfo = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes('soil')) return SENSOR_TYPE_ICONS.soil;
  if (t.includes('weather')) return SENSOR_TYPE_ICONS.weather;
  return SENSOR_TYPE_ICONS.other;
};

export default function SensorRegistry() {
  const navigate = useNavigate();
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { t } = useLanguage();

  useEffect(() => {
    loadSensors();
  }, []);

  const loadSensors = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await sensorsApi.list();
      setSensors(data);
    } catch (err) {
      setError(t("Failed to load sensors. Please check your connection."));
    } finally {
      setIsLoading(false);
    }
  };

  const batteryLevels = useMemo(() => {
    const levels: Record<string, number> = {};
    sensors.forEach((s) => {
      levels[s.id] = Math.floor(Math.random() * 100);
    });
    return levels;
  }, [sensors]);

  const activeSensors = sensors.filter(s => s.status === 'active');
  const draftSensors = sensors.filter(s => s.status === 'draft');
  const inactiveSensors = sensors.filter(s => s.status === 'inactive');
  const unassignedSensors = sensors.filter(s => !s.current_assignment);

  const avgBattery = sensors.length > 0
    ? Math.round(Object.values(batteryLevels).reduce((a, b) => a + b, 0) / sensors.length)
    : 0;

  const batteryKpiColor = avgBattery > 60 ? 'green' : avgBattery > 30 ? 'amber' : 'red';

  const sensorTypeBreakdown = sensors.reduce((acc, s) => {
    const type = s.type.toLowerCase().includes('soil') ? 'soil' : s.type.toLowerCase().includes('weather') ? 'weather' : 'other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filteredSensors = sensors
    .filter(s => statusFilter === 'all' || s.status === statusFilter)
    .filter(s =>
      s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.current_assignment?.field_name && s.current_assignment.field_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  const getStatusInfo = (status?: string) => {
    const s = (status || "draft").toLowerCase();
    return STATUS_META[s] || STATUS_META.draft;
  };

  const statusTabs = [
    { key: 'all', label: t('All'), count: sensors.length },
    { key: 'active', label: t('Active'), count: activeSensors.length },
    { key: 'draft', label: t('Draft'), count: draftSensors.length },
    { key: 'inactive', label: t('Inactive'), count: inactiveSensors.length },
  ];

  return (
    <AppLayout>
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          /* Skeleton Loading */
          <div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                  <Skeleton className="h-10 w-10 rounded-lg mb-3" />
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-10 w-64" />
              <div className="flex gap-3">
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-10 w-40" />
              </div>
            </div>
            <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-slate-50 dark:border-slate-800">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24 ml-auto" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-2 w-24 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl text-red-500">error</span>
            </div>
            <p className="text-slate-700 font-medium mb-4">{error}</p>
            <button
              onClick={loadSensors}
              className="flex items-center gap-2 bg-white border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50"
            >
              <span className="material-symbols-outlined text-lg">refresh</span>
              {t('Try Again')}
            </button>
          </div>
        ) : (
          <div className="animate-fade-in">
            {/* KPI Summary Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 animate-slide-up">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <span className="material-symbols-outlined text-2xl text-blue-600 dark:text-blue-400">sensors</span>
                  </div>
                </div>
                <p className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{sensors.length}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">{t('Total Sensors')}</p>
              </div>

              <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 animate-slide-up" style={{ animationDelay: '50ms' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <span className="material-symbols-outlined text-2xl text-green-600 dark:text-green-400">check_circle</span>
                  </div>
                </div>
                <p className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{activeSensors.length}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">{t('Active')}</p>
              </div>

              <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 animate-slide-up" style={{ animationDelay: '100ms' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <span className="material-symbols-outlined text-2xl text-amber-600 dark:text-amber-400">link_off</span>
                  </div>
                </div>
                <p className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{unassignedSensors.length}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">{t('Unassigned')}</p>
              </div>

              <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 animate-slide-up" style={{ animationDelay: '150ms' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 bg-${batteryKpiColor}-50 dark:bg-${batteryKpiColor}-900/20 rounded-lg`}>
                    <span className={`material-symbols-outlined text-2xl text-${batteryKpiColor}-600 dark:text-${batteryKpiColor}-400`}>battery_charging_full</span>
                  </div>
                </div>
                <p className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{avgBattery}%</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">{t('Avg Battery')}</p>
              </div>
            </div>

            {/* Header + Toolbar Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl mb-1">
                  {t("Sensor Inventory")}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t("Manage your sensor fleet, simulate readings, and check device health.")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-2 transition-colors ${viewMode === 'table' ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                  >
                    <span className="material-symbols-outlined text-[20px]">table_rows</span>
                  </button>
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`p-2 transition-colors ${viewMode === 'cards' ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                  >
                    <span className="material-symbols-outlined text-[20px]">grid_view</span>
                  </button>
                </div>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 dark:bg-white dark:text-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-all"
                  onClick={() => navigate("/sensors/new")}
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  {t("Register New Sensor")}
                </button>
              </div>
            </div>

            {/* Search + Status Filter Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <span className="material-symbols-outlined text-[20px]">search</span>
                </div>
                <input
                  className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 pl-10 pr-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-all"
                  placeholder={t("Filter sensors...")}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {statusTabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-all cursor-pointer whitespace-nowrap ${
                      statusFilter === tab.key
                        ? 'bg-primary/10 text-primary border-primary font-semibold'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary/50'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>
            </div>

            {/* Sensor Type Summary Bar */}
            {sensors.length > 0 && (
              <div className="flex items-center gap-4 mb-6 text-sm">
                {Object.entries(sensorTypeBreakdown).map(([type, count]) => {
                  const info = SENSOR_TYPE_ICONS[type] || SENSOR_TYPE_ICONS.other;
                  return (
                    <span key={type} className="flex items-center gap-1.5">
                      <span className={`material-symbols-outlined text-[18px] ${info.text}`}>{info.icon}</span>
                      <span className="text-slate-600 dark:text-slate-400 capitalize">{t(type)}: {count}</span>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Empty state for filtered results */}
            {sensors.length > 0 && filteredSensors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-3">search_off</span>
                <p className="text-slate-500 dark:text-slate-400">{t('No sensors match your filters.')}</p>
              </div>
            ) : sensors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-surface-light dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-4xl text-primary">sensors</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                  {t("No sensors found")}
                </h3>
                <p className="text-slate-500 mb-6 text-center max-w-sm">
                  {t("Register your first sensor to start monitoring.")}
                </p>
                <button
                  onClick={() => navigate("/sensors/new")}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-slate-900 shadow-sm hover:bg-primary-dark transition-all"
                >
                  <span className="material-symbols-outlined">add</span>
                  {t("Register First Sensor")}
                </button>
              </div>
            ) : viewMode === 'table' ? (
              /* Enhanced Table View */
              <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Table Header */}
                <div className="hidden md:grid grid-cols-[1fr_0.7fr_1fr_0.8fr_0.7fr_0.8fr_0.6fr] gap-4 px-6 py-3 border-b border-slate-100 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <span>{t("Sensor Name")}</span>
                  <span>{t("Type")}</span>
                  <span>{t("Assignment")}</span>
                  <span>{t("Metrics")}</span>
                  <span>{t("Status")}</span>
                  <span>{t("Battery")}</span>
                  <span className="text-right">{t("Action")}</span>
                </div>

                {/* Table Rows */}
                {filteredSensors.map((sensor, idx) => {
                  const typeInfo = getSensorTypeInfo(sensor.type);
                  const statusInfo = getStatusInfo(sensor.status);
                  const batteryLevel = batteryLevels[sensor.id] ?? 50;
                  const batteryColor =
                    batteryLevel > 60 ? "bg-emerald-500" :
                      batteryLevel > 30 ? "bg-amber-500" : "bg-red-500";
                  const batteryTrack =
                    batteryLevel > 60 ? "bg-emerald-100 dark:bg-emerald-900/30" :
                      batteryLevel > 30 ? "bg-amber-100 dark:bg-amber-900/30" : "bg-red-100 dark:bg-red-900/30";
                  const metrics = sensor.metrics.split(',').map(m => m.trim()).filter(Boolean);

                  return (
                    <div
                      key={sensor.id}
                      className={`group grid grid-cols-1 md:grid-cols-[1fr_0.7fr_1fr_0.8fr_0.7fr_0.8fr_0.6fr] gap-2 md:gap-4 px-6 py-4 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer items-center ${idx % 2 === 1 ? 'bg-slate-50/30 dark:bg-slate-800/20' : ''}`}
                      onClick={() => navigate(`/sensors/${sensor.id}`)}
                    >
                      {/* Sensor Name */}
                      <span className="text-sm font-mono font-semibold text-slate-900 dark:text-white">
                        <span className="md:hidden text-xs text-slate-500 font-sans font-normal mr-2">ID:</span>
                        {sensor.name}
                      </span>

                      {/* Type */}
                      <span className="flex items-center gap-2">
                        <span className={`p-1.5 rounded-lg ${typeInfo.bg}`}>
                          <span className={`material-symbols-outlined text-lg ${typeInfo.text}`}>{typeInfo.icon}</span>
                        </span>
                        <span className="capitalize text-sm text-slate-700 dark:text-slate-300 hidden lg:inline">{t(sensor.type)}</span>
                      </span>

                      {/* Assignment */}
                      <span className="text-sm">
                        {sensor.current_assignment?.field_name ? (
                          <span className="text-primary font-medium">{t(sensor.current_assignment.field_name)}</span>
                        ) : (
                          <span className="text-amber-500 italic">{t("Unassigned")}</span>
                        )}
                      </span>

                      {/* Metrics */}
                      <div className="hidden md:flex flex-wrap gap-1">
                        {metrics.slice(0, 3).map(m => (
                          <span key={m} className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs text-slate-600 dark:text-slate-400">{m}</span>
                        ))}
                        {metrics.length > 3 && (
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs text-slate-500">+{metrics.length - 3}</span>
                        )}
                      </div>

                      {/* Status */}
                      <span className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${statusInfo.dotColor} ${sensor.status === 'active' ? 'animate-pulse' : ''}`}></span>
                        <span className={`text-sm font-medium capitalize ${statusInfo.color}`}>
                          {t(sensor.status || "Draft")}
                        </span>
                      </span>

                      {/* Battery Level */}
                      <div className="flex items-center gap-3">
                        <div className={`flex-1 h-2 rounded-full ${batteryTrack} max-w-[100px]`}>
                          <div
                            className={`h-full rounded-full ${batteryColor} transition-all`}
                            style={{ width: `${batteryLevel}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium text-slate-500 w-8 text-right">{batteryLevel}%</span>
                      </div>

                      {/* Action */}
                      <div className="flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/sensors/${sensor.id}`);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                          {t("Simulate")}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Table Footer */}
                <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                  <span className="text-sm text-slate-500">
                    {t("Showing")} <span className="font-semibold text-slate-700 dark:text-slate-300">1</span> {t("to")} <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredSensors.length}</span> {t("of")} <span className="font-semibold text-slate-700 dark:text-slate-300">{sensors.length}</span> {t("sensors")}
                  </span>
                </div>
              </div>
            ) : (
              /* Card View */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSensors.map(sensor => {
                  const typeInfo = getSensorTypeInfo(sensor.type);
                  const statusInfo = getStatusInfo(sensor.status);
                  const batteryLevel = batteryLevels[sensor.id] ?? 50;
                  const batteryBarColor = batteryLevel > 60 ? 'bg-emerald-500' : batteryLevel > 30 ? 'bg-amber-500' : 'bg-red-500';
                  const batteryTrack = batteryLevel > 60 ? 'bg-emerald-100 dark:bg-emerald-900/30' : batteryLevel > 30 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-red-100 dark:bg-red-900/30';
                  const metrics = sensor.metrics.split(',').map(m => m.trim()).filter(Boolean);

                  return (
                    <div
                      key={sensor.id}
                      className="group bg-surface-light dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 p-5 hover:border-primary/50 hover-lift cursor-pointer transition-all"
                      onClick={() => navigate(`/sensors/${sensor.id}`)}
                    >
                      {/* Header: status + type badge */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${statusInfo.dotColor} ${sensor.status === 'active' ? 'animate-pulse' : ''}`}></span>
                          <span className={`text-xs font-semibold uppercase tracking-wide ${statusInfo.color}`}>{t(sensor.status || 'Draft')}</span>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${typeInfo.bg} ${typeInfo.text}`}>
                          <span className="material-symbols-outlined text-[14px]">{typeInfo.icon}</span>
                          {sensor.type}
                        </span>
                      </div>

                      {/* Sensor name */}
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{sensor.name}</h3>
                      <p className="text-xs font-mono text-slate-400 mb-4">{sensor.id.slice(0, 8)}</p>

                      {/* Metrics chips */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {metrics.slice(0, 5).map(m => (
                          <span key={m} className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs text-slate-600 dark:text-slate-400">{m}</span>
                        ))}
                        {metrics.length > 5 && (
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs text-slate-500">+{metrics.length - 5}</span>
                        )}
                      </div>

                      {/* Assignment */}
                      <div className="flex items-center gap-2 text-sm mb-3">
                        <span className="material-symbols-outlined text-[16px] text-slate-400">location_on</span>
                        {sensor.current_assignment?.field_name ? (
                          <span className="text-primary font-medium">{sensor.current_assignment.field_name}</span>
                        ) : (
                          <span className="text-amber-500 italic">{t('Unassigned')}</span>
                        )}
                      </div>

                      {/* Created date */}
                      <p className="text-xs text-slate-400 mb-4">
                        {t('Since')}: {new Date(sensor.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>

                      {/* Battery bar */}
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-xs text-slate-500 w-14">{t('Battery')}</span>
                        <div className={`flex-1 h-2.5 rounded-full ${batteryTrack}`}>
                          <div className={`h-full rounded-full ${batteryBarColor} transition-all`} style={{ width: `${batteryLevel}%` }}></div>
                        </div>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 w-10 text-right">{batteryLevel}%</span>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/sensors/${sensor.id}`); }}
                          className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-primary transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                          {t('Simulate Reading')}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/sensors/${sensor.id}`); }}
                          className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                        >
                          {t('View')}
                          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="hidden md:flex items-center justify-between px-8 py-4 border-t border-slate-200 dark:border-slate-800 mt-auto">
        <span className="text-xs text-slate-400">© {new Date().getFullYear()} RootSphere AI. All rights reserved.</span>
        <div className="flex items-center gap-6 text-xs text-slate-400">
          <a href="#" className="hover:text-slate-600 transition-colors">{t("Privacy Policy")}</a>
          <a href="#" className="hover:text-slate-600 transition-colors">{t("Terms of Service")}</a>
          <a href="#" className="hover:text-slate-600 transition-colors">{t("Support")}</a>
        </div>
      </footer>
    </AppLayout>
  );
}
