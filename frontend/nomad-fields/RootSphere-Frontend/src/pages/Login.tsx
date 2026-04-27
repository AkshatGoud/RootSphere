import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi } from "@/lib/api";
import { auth } from "@/lib/storage";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: any) => void;
                    renderButton: (element: HTMLElement, config: any) => void;
                };
            };
        };
    }
}

const Login = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const googleButtonRef = useRef<HTMLDivElement>(null);

    // Keep a ref to the latest credential handler so the effect (which runs
    // once) can call it without taking a stale closure on `t` / `navigate`.
    const handleGoogleSuccessRef = useRef<(credential: string) => Promise<void>>();
    handleGoogleSuccessRef.current = async (credential: string) => {
        setIsLoading(true);
        try {
            const response = await authApi.googleLogin(credential);
            auth.setSession({
                token: response.access_token,
                name: response.farmer_name,
                id: response.farmer_id,
            });
            toast.success(`${t("welcomeBack")}, ${response.farmer_name}!`);
            navigate("/dashboard");
        } catch (error: any) {
            toast.error(error.message || t("loginFailed"));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (!clientId) return;

        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = () => {
            window.google?.accounts.id.initialize({
                client_id: clientId,
                callback: (response: { credential: string }) => {
                    handleGoogleSuccessRef.current?.(response.credential);
                },
            });
            if (googleButtonRef.current) {
                window.google?.accounts.id.renderButton(googleButtonRef.current, {
                    theme: "outline",
                    size: "large",
                    width: "400",
                    text: "signin_with",
                });
            }
        };
        document.head.appendChild(script);
        return () => {
            if (script.parentNode) script.parentNode.removeChild(script);
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await authApi.login({ email, password });
            auth.setSession({
                token: response.access_token,
                name: response.farmer_name,
                id: response.farmer_id,
            });
            toast.success(`${t("welcomeBack")}, ${response.farmer_name}!`);
            navigate("/dashboard");
        } catch (error: any) {
            toast.error(error.message || t("loginFailed"));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full overflow-hidden font-display">
            {/* Left Panel - Hero Image */}
            <div className="relative hidden h-full w-1/2 flex-col bg-zinc-900 p-10 text-white lg:flex">
                <div
                    className="absolute inset-0 z-0 bg-cover bg-center"
                    style={{
                        backgroundImage:
                            "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAklpqPnKACcKz-ccbI3oiUdsXazT3hb-upKH6UiDpA1NHXrZSAz8oSI6YjkDjPRyjZxgUVBjmb1q2NDSBUbb4PXyeNYXmZ4fOKxdyZTt1NsRVVeJtd6Jrbujgrz1WUNvAGEQ55xQ63CxND2SAHACgF_XXScKn9IrRS0vh2HB7LoPhZRCUHpxYESrHNkY8wRKGfpC0eXMDxyBbzHqBgfCIiPscWIC-KGnGBO393PTmt0DvvSmFbLIk2Mh_oiUnHoW9f-jTKBcZJrWeu')",
                    }}
                >
                    <div className="absolute inset-0 bg-black/40 mix-blend-multiply"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30"></div>
                </div>
                {/* Logo */}
                <div className="relative z-20 flex items-center gap-2 text-lg font-medium">
                    <span className="material-symbols-outlined text-primary text-2xl">eco</span>
                    <span className="tracking-tight text-white font-semibold">
                        RootSphere AI
                    </span>
                </div>
                {/* Quote */}
                <div className="relative z-20 mt-auto">
                    <blockquote className="space-y-2">
                        <p className="text-lg font-light leading-relaxed text-gray-100">
                            {t("loginQuote")}
                        </p>
                        <footer className="text-sm text-gray-300">
                            {t("sustainableFarmingInitiative")}
                        </footer>
                    </blockquote>
                </div>
            </div>

            {/* Right Panel - Form */}
            <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-8 xl:px-24">
                <div className="mx-auto w-full max-w-[400px]">
                    {/* Mobile Logo */}
                    <div className="flex items-center gap-2 mb-8 lg:hidden justify-center">
                        <span className="material-symbols-outlined text-primary text-3xl">eco</span>
                        <span className="text-xl font-bold tracking-tight text-gray-900">
                            RootSphere AI
                        </span>
                    </div>

                    <div className="mb-8 text-center lg:text-left">
                        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
                            {t("welcomeBack")}
                        </h1>
                        <p className="mt-2 text-sm text-gray-500">
                            {t("enterCredentials")}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium leading-none text-gray-700">
                                {t("email")}
                            </label>
                            <input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label htmlFor="password" className="text-sm font-medium leading-none text-gray-700">
                                    {t("password")}
                                </label>
                                <Link
                                    to="/forgot-password"
                                    className="text-sm font-medium text-primary hover:text-primary-dark hover:underline"
                                >
                                    {t("forgotPassword")}
                                </Link>
                            </div>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <span className="material-symbols-outlined text-[18px]">
                                        {showPassword ? "visibility_off" : "visibility"}
                                    </span>
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 mt-2 shadow-sm"
                        >
                            {isLoading ? t("signingIn") : t("signIn")}
                        </button>
                    </form>

                    {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
                        <div className="mt-4">
                            <div className="relative my-4">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-2 text-gray-400">{t("or") || "or"}</span>
                                </div>
                            </div>
                            <div ref={googleButtonRef} className="flex justify-center"></div>
                        </div>
                    )}

                    <p className="mt-6 text-center text-sm text-gray-500">
                        {t("dontHaveAccount")}{" "}
                        <Link
                            to="/register"
                            className="font-medium text-primary hover:text-primary-dark hover:underline underline-offset-4"
                        >
                            {t("createAccount")}
                        </Link>
                    </p>

                    <div className="mt-8 text-center text-xs text-gray-400">
                        <p>© 2026 RootSphere AI Inc. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
