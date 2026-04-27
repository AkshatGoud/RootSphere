import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi, farmersApi } from "@/lib/api";
import { storage } from "@/lib/storage";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

const Register = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        email: "",
        password: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const googleButtonRef = useRef<HTMLDivElement>(null);

    const handleGoogleSuccess = async (credential: string) => {
        setIsLoading(true);
        try {
            const response = await authApi.googleLogin(credential);
            localStorage.setItem("access_token", response.access_token);
            storage.setFarmerId(response.farmer_id);
            localStorage.setItem("farmer_name", response.farmer_name);
            toast.success(t("accountCreatedSuccess"));
            navigate("/dashboard");
        } catch (error: any) {
            toast.error(error.message || t("registrationFailed"));
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
                    handleGoogleSuccess(response.credential);
                },
            });
            if (googleButtonRef.current) {
                window.google?.accounts.id.renderButton(googleButtonRef.current, {
                    theme: "outline",
                    size: "large",
                    width: "400",
                    text: "signup_with",
                });
            }
        };
        document.head.appendChild(script);
        return () => {
            document.head.removeChild(script);
        };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Logic ref: phone is now a single string from input
            await farmersApi.create(formData);
            toast.success(t("accountCreatedSuccess"));
            navigate("/");
        } catch (error: any) {
            toast.error(error.message || t("registrationFailed"));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col lg:flex-row font-sans text-[#0d1b13] dark:text-[#e7f3ec] antialiased bg-background-light dark:bg-background-dark">
            {/* Left Side: Brand Image & Tagline */}
            <div className="relative hidden lg:flex lg:w-1/2 items-center justify-center overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-black/40 z-10"></div>
                    <div
                        className="h-full w-full bg-cover bg-center"
                        data-alt="Lush green crop field under golden sunset sunlight"
                        style={{
                            backgroundImage:
                                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuChAONfImbxR3uuEjXPkpsnHmFnpYPgykLJGFMLU-NvbV1GhotMFRhPqa_m56gWHFd0MUDs7XF8LKC3eqXh31JJtGszHyyopvzvVcSy8Au9s-4n4F0jZfB_n-G80if3-hWYoQZ_AN2xHJzo2QZjF0nWnZ_qEOJrgiLxbANhcMybV8smkqKyBUpwqA_edK5GncNKCoENZZQOvB7QyamWzc_OfKaXeJ1gVKwgBeq_Bwn3GKccAKmCwiSVfos4nwUG55sQJL4OuUzWJ2FA')",
                        }}
                    ></div>
                </div>
                <div className="relative z-20 px-12 max-w-xl">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="size-10 bg-primary rounded-lg flex items-center justify-center text-[#0d1b13]">
                            <svg
                                className="size-7"
                                fill="none"
                                viewBox="0 0 48 48"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    clipRule="evenodd"
                                    d="M24 18.4228L42 11.475V34.3663C42 34.7796 41.7457 35.1504 41.3601 35.2992L24 42V18.4228Z"
                                    fill="currentColor"
                                    fillRule="evenodd"
                                ></path>
                                <path
                                    clipRule="evenodd"
                                    d="M24 8.18819L33.4123 11.574L24 15.2071L14.5877 11.574L24 8.18819ZM9 15.8487L21 20.4805V37.6263L9 32.9945V15.8487ZM27 37.6263V20.4805L39 15.8487V32.9945L27 37.6263ZM25.354 2.29885C24.4788 1.98402 23.5212 1.98402 22.646 2.29885L4.98454 8.65208C3.7939 9.08038 3 10.2097 3 11.475V34.3663C3 36.0196 4.01719 37.5026 5.55962 38.098L22.9197 44.7987C23.6149 45.0671 24.3851 45.0671 25.0803 44.7987L42.4404 38.098C43.9828 37.5026 45 36.0196 45 34.3663V11.475C45 10.2097 44.2061 9.08038 43.0155 8.65208L25.354 2.29885Z"
                                    fill="currentColor"
                                    fillRule="evenodd"
                                ></path>
                            </svg>
                        </div>
                        <h2 className="text-white text-3xl font-bold tracking-tight">
                            RootSphere AI
                        </h2>
                    </div>
                    <h1 className="text-white text-5xl font-extrabold leading-[1.1] mb-6">
                        {t("empowering")} <span className="text-primary">{t("sustainable")}</span> {t("growth")}
                    </h1>
                    <p className="text-white/80 text-lg font-light leading-relaxed">
                        {t("registerHeroDescription")}
                    </p>
                </div>
            </div>
            {/* Right Side: Form */}
            <div className="flex-1 flex flex-col justify-center bg-white dark:bg-background-dark px-6 py-12 lg:px-24">
                <div className="w-full max-w-md mx-auto">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center gap-3 mb-10">
                        <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-[#0d1b13]">
                            <span className="material-symbols-outlined text-xl">
                                potted_plant
                            </span>
                        </div>
                        <h2 className="text-[#0d1b13] dark:text-white text-xl font-bold">
                            RootSphere AI
                        </h2>
                    </div>
                    <div className="mb-10">
                        <h2 className="text-[#0d1b13] dark:text-white text-3xl font-extrabold tracking-tight mb-2">
                            {t("createFarmerAccount")}
                        </h2>
                        <p className="text-[#4c9a6c] dark:text-primary/70 text-base">
                            {t("enterDetailsToJoin")}
                        </p>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Full Name Field */}
                        <div>
                            <label
                                className="block text-sm font-semibold text-[#0d1b13] dark:text-white/90 mb-1.5"
                                htmlFor="name"
                            >
                                {t("fullName")}
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#4c9a6c]">
                                    <span className="material-symbols-outlined text-xl">
                                        person
                                    </span>
                                </span>
                                <input
                                    className="w-full pl-11 bg-background-light dark:bg-background-dark border border-[#cfe7d9] dark:border-[#2a4d38] rounded-lg h-12 text-[#0d1b13] dark:text-white focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-gray-400"
                                    id="name"
                                    name="name"
                                    placeholder="John Doe"
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                        {/* Phone Number Field */}
                        <div>
                            <label
                                className="block text-sm font-semibold text-[#0d1b13] dark:text-white/90 mb-1.5"
                                htmlFor="phone"
                            >
                                {t("phoneNumber")}
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#4c9a6c]">
                                    <span className="material-symbols-outlined text-xl">
                                        call
                                    </span>
                                </span>
                                <input
                                    className="w-full pl-11 bg-background-light dark:bg-background-dark border border-[#cfe7d9] dark:border-[#2a4d38] rounded-lg h-12 text-[#0d1b13] dark:text-white focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-gray-400"
                                    id="phone"
                                    name="phone"
                                    placeholder="+1 (555) 000-0000"
                                    type="tel"
                                    required
                                    value={formData.phone}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                        {/* Email Address Field */}
                        <div>
                            <label
                                className="block text-sm font-semibold text-[#0d1b13] dark:text-white/90 mb-1.5"
                                htmlFor="email"
                            >
                                {t("emailAddress")}
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#4c9a6c]">
                                    <span className="material-symbols-outlined text-xl">
                                        mail
                                    </span>
                                </span>
                                <input
                                    className="w-full pl-11 bg-background-light dark:bg-background-dark border border-[#cfe7d9] dark:border-[#2a4d38] rounded-lg h-12 text-[#0d1b13] dark:text-white focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-gray-400"
                                    id="email"
                                    name="email"
                                    placeholder="farmer@rootsphere.ai"
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                        {/* Password Field */}
                        <div>
                            <label
                                className="block text-sm font-semibold text-[#0d1b13] dark:text-white/90 mb-1.5"
                                htmlFor="password"
                            >
                                {t("password")}
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#4c9a6c]">
                                    <span className="material-symbols-outlined text-xl">
                                        lock
                                    </span>
                                </span>
                                <input
                                    className="w-full pl-11 pr-11 bg-background-light dark:bg-background-dark border border-[#cfe7d9] dark:border-[#2a4d38] rounded-lg h-12 text-[#0d1b13] dark:text-white focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-gray-400"
                                    id="password"
                                    name="password"
                                    placeholder="••••••••"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                />
                                <button
                                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-primary"
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    <span className="material-symbols-outlined text-xl">
                                        {showPassword ? "visibility_off" : "visibility"}
                                    </span>
                                </button>
                            </div>
                        </div>
                        {/* Terms & Conditions */}
                        <div className="flex items-start gap-3 py-2">
                            <input
                                className="mt-1 size-4 rounded border-[#cfe7d9] text-primary focus:ring-primary"
                                id="terms"
                                type="checkbox"
                                required
                            />
                            <label
                                className="text-sm text-[#4c9a6c] dark:text-gray-400"
                                htmlFor="terms"
                            >
                                {t("iAgreeTo")}{" "}
                                <a
                                    className="underline hover:text-primary decoration-primary/30"
                                    href="#"
                                >
                                    {t("termsOfService")}
                                </a>{" "}
                                {t("and")}{" "}
                                <a
                                    className="underline hover:text-primary decoration-primary/30"
                                    href="#"
                                >
                                    {t("privacyPolicy")}
                                </a>
                                .
                            </label>
                        </div>
                        {/* Sign Up Button */}
                        <button
                            className="w-full bg-primary hover:bg-primary/90 text-[#0d1b13] h-12 rounded-lg font-bold text-base shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                            type="submit"
                            disabled={isLoading}
                        >
                            {isLoading ? t("creatingAccount") : t("signUp")}
                            {!isLoading && (
                                <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">
                                    arrow_forward
                                </span>
                            )}
                        </button>
                    </form>

                    {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
                        <div className="mt-4">
                            <div className="relative my-4">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-[#cfe7d9] dark:border-[#2a4d38]"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white dark:bg-background-dark px-2 text-[#4c9a6c] dark:text-gray-400">{t("or") || "or"}</span>
                                </div>
                            </div>
                            <div ref={googleButtonRef} className="flex justify-center"></div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="mt-10 text-center">
                        <p className="text-[#4c9a6c] dark:text-gray-400">
                            {t("alreadyHaveAccount")}
                            <Link
                                className="text-[#0d1b13] dark:text-primary font-bold hover:underline ml-1"
                                to="/"
                            >
                                {t("logIn")}
                            </Link>
                        </p>
                    </div>
                    <div className="mt-12 flex items-center justify-center gap-8 grayscale opacity-50 contrast-125">
                        <span className="text-xs font-bold tracking-widest uppercase">
                            {t("trustedByFarmers")}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
