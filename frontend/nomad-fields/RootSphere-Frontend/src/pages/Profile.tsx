import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { farmersApi } from "@/lib/api";
import { storage } from "@/lib/storage";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Farmer } from "@/types/api";

const LANG_OPTIONS = [
    { code: 'en' as const, label: '🇺🇸 English' },
    { code: 'hi' as const, label: '🇮🇳 हिंदी' },
    { code: 'te' as const, label: '🇮🇳 తెలుగు' },
    { code: 'ta' as const, label: '🇮🇳 தமிழ்' },
];

export function Profile() {
    const navigate = useNavigate();
    const { language, setLanguage, t } = useLanguage();
    const [isLoading, setIsLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        language: language,
    });

    const farmerId = storage.getFarmerId();
    const farmerName = localStorage.getItem("farmer_name");

    useEffect(() => {
        if (!farmerId) {
            navigate("/");
            return;
        }

        const loadProfile = async () => {
            try {
                const data = await farmersApi.get(farmerId);
                setFormData({
                    name: data.name || "",
                    phone: data.phone || "",
                    language: data.language || language,
                });
            } catch (err) {
                toast.error(t("Failed to load profile."));
            } finally {
                setInitialLoading(false);
            }
        };

        loadProfile();
    }, [farmerId, navigate, language, t]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleLogout = () => {
        storage.clearAll();
        localStorage.removeItem("access_token");
        localStorage.removeItem("farmer_name");
        navigate("/");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!farmerId) return;

        setIsLoading(true);
        try {
            const updated = await farmersApi.update(farmerId, formData);
            localStorage.setItem("farmer_name", updated.name);
            setLanguage(updated.language as any);
            toast.success(t("Profile updated successfully"));
        } catch (err: any) {
            toast.error(err.message || t("Failed to update profile"));
        } finally {
            setIsLoading(false);
        }
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
                    <button onClick={() => navigate('/sensors')} className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary transition-colors flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[20px]">sensors</span>
                        {t('Sensors')}
                    </button>
                </nav>
                <div className="hidden md:flex flex-1 items-center justify-end gap-6">
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
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
                                        className={`cursor-pointer ${language === opt.code ? 'text-primary font-bold bg-slate-50 dark:bg-slate-700/50' : 'text-slate-700 dark:text-slate-300'}`}
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

            <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-6 md:p-10 mb-8">
                    <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100 dark:border-slate-800">
                        <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-3xl">account_circle</span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("Profile Settings")}</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t("Update your personal details and app preferences")}</p>
                        </div>
                    </div>

                    {initialLoading ? (
                        <div className="flex justify-center py-12">
                            <span className="material-symbols-outlined text-4xl text-primary animate-spin">refresh</span>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2" htmlFor="name">
                                    {t("Full Name")}
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                                        <span className="material-symbols-outlined text-[20px]">person</span>
                                    </span>
                                    <input
                                        id="name"
                                        name="name"
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="w-full pl-11 bg-white dark:bg-surface-dark border border-slate-300 dark:border-slate-700 rounded-lg h-12 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-slate-400"
                                        placeholder={t("Enter your name")}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2" htmlFor="phone">
                                    {t("Phone Number")}
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                                        <span className="material-symbols-outlined text-[20px]">call</span>
                                    </span>
                                    <input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        required
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="w-full pl-11 bg-white dark:bg-surface-dark border border-slate-300 dark:border-slate-700 rounded-lg h-12 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-slate-400"
                                        placeholder={t("Enter your phone number")}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2" htmlFor="language">
                                    {t("Preferred Language")}
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                                        <span className="material-symbols-outlined text-[20px]">language</span>
                                    </span>
                                    <select
                                        id="language"
                                        name="language"
                                        value={formData.language}
                                        onChange={handleChange}
                                        className="w-full pl-11 pr-10 bg-white dark:bg-surface-dark border border-slate-300 dark:border-slate-700 rounded-lg h-12 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="en">English</option>
                                        <option value="hi">हिंदी (Hindi)</option>
                                        <option value="te">తెలుగు (Telugu)</option>
                                        <option value="ta">தமிழ் (Tamil)</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
                                        <span className="material-symbols-outlined text-[20px]">expand_more</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-12 rounded-lg bg-primary hover:bg-primary-dark text-white font-bold tracking-wide shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <span className="material-symbols-outlined animate-spin font-medium text-[20px]">refresh</span>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-[20px]">save</span>
                                            {t("Save Changes")}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
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
                <button onClick={() => navigate('/sensors')} className="flex flex-col items-center justify-center gap-1 text-slate-500 dark:text-slate-400 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[22px]">sensors</span>
                    <span className="text-xs font-medium">{t('Sensors')}</span>
                </button>
            </div>
        </div>
    );
}
