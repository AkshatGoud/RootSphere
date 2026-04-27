import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { farmersApi } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";

export function Profile() {
    const navigate = useNavigate();
    const { language, setLanguage, t } = useLanguage();
    const { farmerId } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        language: language,
    });

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
        <AppLayout>
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

        </AppLayout>
    );
}
