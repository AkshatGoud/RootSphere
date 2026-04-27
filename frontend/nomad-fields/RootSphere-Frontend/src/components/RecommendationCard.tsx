import { Recommendation, WhyItem } from '@/types/api';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Droplets, Sprout, AlertTriangle, Database, CloudRain, ChevronDown, ChevronUp, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

interface Props {
  recommendation: Recommendation;
  showDetails?: boolean;
}

export function RecommendationCard({ recommendation, showDetails = true }: Props) {
  const [showAllReasons, setShowAllReasons] = useState(false);
  const { t } = useLanguage();

  const getActionColor = (action: string) => {
    switch (action) {
      case 'IRRIGATE_NOW': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DELAY': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'APPLY': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getActionIcon = (action: string, type: 'irrigation' | 'fertilizer') => {
    if (action === 'DELAY') return <XCircle className="h-6 w-6 text-orange-600" />;
    if (action === 'MONITOR') return <AlertCircle className="h-6 w-6 text-yellow-600" />;
    if (action === 'NO_ACTION') return <CheckCircle2 className="h-6 w-6 text-green-600" />;
    
    // Active actions
    if (type === 'irrigation') return <Droplets className="h-6 w-6 text-blue-600 animate-bounce" />;
    return <Sprout className="h-6 w-6 text-green-600 animate-pulse" />;
  };

  // Logic for completeness badge
  const dataCompleteness = recommendation.data_completeness ? Math.round(recommendation.data_completeness * 100) : 0;
  
  const getAccuracyLabel = (score: number) => {
    if (score >= 80) return { label: t('High'), color: 'text-green-600 bg-green-50 border-green-200' };
    if (score >= 60) return { label: t('Medium'), color: 'text-yellow-600 bg-yellow-50 border-yellow-200' };
    return { label: t('Low'), color: 'text-red-600 bg-red-50 border-red-200' };
  };

  const accuracy = getAccuracyLabel(dataCompleteness);

  const formatAction = (action: string, type: 'irrigation' | 'fertilizer') => {
    if (type === 'irrigation' && action === 'IRRIGATE_NOW') return t('IRRIGATE_NOW');
    if (type === 'irrigation' && action === 'DELAY') return t('DELAY');
    if (type === 'fertilizer' && action === 'APPLY') return t('APPLY');
    if (action === 'MONITOR') return t('MONITOR');
    return t('NO_ACTION');
  };

  // Simplify Why List: Only show 1st reason initially
  const whyList = recommendation.why || [];
  const showDetailsSection = whyList.length > 0;

  // Normalize items to WhyItem format for display
  const normalizedReasons: WhyItem[] = whyList.map(item => {
    if (typeof item === 'object' && item !== null && 'category' in item) {
      return item as WhyItem;
    }
    return { category: 'info' as const, icon: 'info', severity: 'info' as const, title: String(item), detail: '' };
  });

  // Filter out system/missing-data messages
  const meaningfulReasons = normalizedReasons.filter(r =>
    r.severity !== 'warning' || !r.title.toLowerCase().includes('missing')
  );

  const displayedReasons = showAllReasons ? meaningfulReasons : meaningfulReasons.slice(0, 1);
  const hasMore = meaningfulReasons.length > 1;

  // Translation helper for dynamic backend strings
  const t_dynamic = (str: string) => {
     // Check if we have exact match
     const translated = t(str);
     if (translated !== str) return translated;

     // Handle partial matches if needed, or return original
     return str;
  };

  // Prepare chart data if forecast is available
  const chartData = (() => {
    if (!recommendation.ai_forecast && !recommendation.ai_history) return null;
    
    const history = recommendation.ai_history || [];
    const forecast = recommendation.ai_forecast || [];
    
    const historyData = history.map((rain, idx) => ({
      day: `Day -${history.length - idx}`,
      rainfall: rain,
      type: 'history'
    }));
    
    const forecastData = forecast.map((rain, idx) => ({
      day: `Day +${idx + 1}`,
      rainfall: rain,
      type: 'forecast'
    }));
    
    return [...historyData, ...forecastData];
  })();

  return (
    <Card className="overflow-hidden border-l-4 border-l-primary shadow-lg hover:shadow-xl transition-shadow animate-slide-up">
      <CardContent className="p-0">
        
        {/* Header - Date & Accuracy */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/20">
            <span className="text-sm font-medium text-muted-foreground">
                {new Date(recommendation.ts).toLocaleDateString(undefined, { dateStyle: 'long' })}
            </span>
            <div className={cn("flex items-center gap-2 text-xs px-2 py-1 rounded-full border", accuracy.color)}>
                <Database className="h-3 w-3" />
                <span className="font-semibold">{t('Accuracy')}: {accuracy.label} ({dataCompleteness}%)</span>
            </div>
        </div>

        <div className="p-5 space-y-6">
            
            {/* Primary Actions - Side by Side */}
            <div className="grid gap-4 sm:grid-cols-2">
                {/* Irrigation Action */}
                <div className={cn("relative overflow-hidden rounded-xl border-2 p-5 transition-all", getActionColor(recommendation.irrigation.action))}>
                    <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-sm uppercase tracking-wider opacity-70">{t('Irrigation')}</h4>
                        <div className="bg-white/80 p-2 rounded-full shadow-sm">
                            {getActionIcon(recommendation.irrigation.action, 'irrigation')}
                        </div>
                    </div>
                    <p className="text-2xl font-black tracking-tight leading-none mb-2">
                        {formatAction(recommendation.irrigation.action, 'irrigation')}
                    </p>
                    {recommendation.irrigation.liters_per_acre > 0 && (
                        <div className="inline-flex items-center gap-1 bg-white/60 px-2 py-1 rounded-md text-sm font-semibold">
                            <Droplets className="h-3.5 w-3.5" />
                            {recommendation.irrigation.liters_per_acre} L/acre
                        </div>
                    )}
                </div>

                {/* Fertilizer Action */}
                <div className={cn("relative overflow-hidden rounded-xl border-2 p-5 transition-all", getActionColor(recommendation.fertilizer.action))}>
                     <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-sm uppercase tracking-wider opacity-70">{t('Fertilizer')}</h4>
                        <div className="bg-white/80 p-2 rounded-full shadow-sm">
                            {getActionIcon(recommendation.fertilizer.action, 'fertilizer')}
                        </div>
                    </div>
                    <p className="text-2xl font-black tracking-tight leading-none mb-2">
                        {formatAction(recommendation.fertilizer.action, 'fertilizer')}
                    </p>
                    {recommendation.fertilizer.n_kg_acre > 0 && (
                         <div className="bg-white/60 rounded-md p-2 text-sm font-semibold grid grid-cols-3 gap-2 text-center">
                            <span>N: {recommendation.fertilizer.n_kg_acre}</span>
                            <span>P: {recommendation.fertilizer.p_kg_acre}</span>
                            <span>K: {recommendation.fertilizer.k_kg_acre}</span>
                         </div>
                    )}
                </div>
            </div>

            {/* Risk Alert (Weather Conflict) */}
            {recommendation.risk_alert && (
                <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 flex items-start gap-3 animate-pulse">
                    <div className="mt-0.5 p-1 bg-destructive/10 rounded-full">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                        <h4 className="font-bold text-destructive text-sm mb-1">{t('Weather Alert')}</h4>
                        <p className="text-sm text-foreground/80">{t_dynamic(recommendation.risk_alert)}</p>
                    </div>
                </div>
            )}

            {/* Reasoning Section (Key Factors) */}
             {showDetails && showDetailsSection && (
                <div className="space-y-3">
                     <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider opacity-80 flex items-center gap-2">
                         <AlertCircle className="h-4 w-4" />
                         {t('Why this recommendation?')}
                     </h4>
                     
                     <div className="flex flex-wrap gap-2">
                        {displayedReasons.map((item, idx) => {
                            const severityStyles: Record<string, string> = {
                              danger: "bg-red-50 text-red-700 border-red-200",
                              warning: "bg-amber-50 text-amber-700 border-amber-200",
                              success: "bg-green-50 text-green-700 border-green-200",
                              info: "bg-blue-50 text-blue-700 border-blue-100",
                            };
                            const style = severityStyles[item.severity] || severityStyles.info;

                            return (
                                <div key={idx} className={cn(
                                    "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium border shadow-sm",
                                    style
                                )}>
                                    <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                                    <span>{item.title}</span>
                                </div>
                            );
                        })}
                     </div>
                     
                     {hasMore && (
                            <button 
                                onClick={() => setShowAllReasons(!showAllReasons)}
                                className="mt-2 text-xs font-medium text-muted-foreground hover:text-primary hover:underline flex items-center gap-1"
                            >
                                {showAllReasons ? (
                                    <>
                                        {t('Show less')}
                                        <ChevronUp className="h-3 w-3" />
                                    </>
                                ) : (
                                    <>
                                        {t('Show more details')} ({meaningfulReasons.length - 1} more)
                                        <ChevronDown className="h-3 w-3" />
                                    </>
                                )}
                            </button>
                        )}
                </div>
            )}

            {/* AI Weather Forecast Chart (Bottom) */}
            {chartData && chartData.length > 0 && (
                <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 mb-4">
                        <CloudRain className="h-5 w-5 text-info" />
                        <h4 className="font-semibold">{t('AI Rainfall Prediction')}</h4>
                    </div>
                    <div className="bg-gradient-to-br from-info/5 to-primary/5 rounded-lg p-4 border border-info/20 h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis 
                                dataKey="day" 
                                tick={{ fontSize: 11 }}
                                stroke="hsl(var(--muted-foreground))"
                                interval="preserveStartEnd"
                            />
                            <YAxis 
                                label={{ value: 'mm', angle: -90, position: 'insideLeft', fontSize: 11 }}
                                tick={{ fontSize: 11 }}
                                stroke="hsl(var(--muted-foreground))"
                            />
                            <Tooltip 
                                contentStyle={{ 
                                backgroundColor: 'hsl(var(--background))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                fontSize: '12px'
                                }}
                            />
                            <ReferenceLine x={`Day -1`} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                            <Line 
                                type="monotone" 
                                dataKey="rainfall" 
                                stroke="hsl(var(--info))" 
                                strokeWidth={3}
                                dot={{ fill: 'hsl(var(--info))', r: 4, strokeWidth: 0 }}
                                activeDot={{ r: 6 }}
                            />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

        </div>
      </CardContent>
    </Card>
  );
}
