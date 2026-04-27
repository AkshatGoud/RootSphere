import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Key, ArrowLeft, Lock, Eye, EyeOff, Leaf, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ForgotPassword() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      await authApi.forgotPassword(email);
      toast.success(t("verificationCodeSent"));
      setStep(2);
    } catch (err: any) {
      toast.error(err.message || t("failedToSendCode"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !newPassword) return;

    setIsLoading(true);
    try {
      await authApi.resetPassword({ email, code, new_password: newPassword });
      toast.success(t("passwordUpdatedSuccess"));
      setStep(3);
      setTimeout(() => navigate("/"), 2000);
    } catch (err: any) {
      toast.error(err.message || t("failedToResetPassword"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Left Panel - Brand Image */}
      <div className="relative hidden lg:flex lg:w-1/2 items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black/40 z-10"></div>
          <div
            className="h-full w-full bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1464226184884-fa280b87c399?ixlib=rb-4.0.3&auto=format&fit=crop&w=2940&q=80')",
            }}
          ></div>
        </div>

        <div className="relative z-20 px-12 max-w-xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="size-10 bg-emerald-400 rounded-lg flex items-center justify-center text-emerald-900">
              <Leaf className="size-7" />
            </div>
            <h2 className="text-white text-3xl font-bold tracking-tight">
              RootSphere AI
            </h2>
          </div>

          <h1 className="text-white text-5xl font-extrabold leading-[1.1] mb-6">
            {t("secureYour")} <span className="text-emerald-400">{t("account")}</span>
          </h1>
          <p className="text-white/80 text-lg font-light leading-relaxed">
            {t("forgotPasswordHeroDescription")}
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col justify-center bg-white px-6 py-12 lg:px-24">
        <div className="w-full max-w-md mx-auto">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="size-8 bg-emerald-400 rounded-lg flex items-center justify-center text-emerald-900">
              <Leaf className="size-5" />
            </div>
            <h2 className="text-gray-900 text-xl font-bold">RootSphere AI</h2>
          </div>

          {/* Back Link */}
          <Link
            to="/"
            className="inline-flex items-center text-sm text-emerald-600 hover:text-emerald-700 mb-8"
          >
            <ArrowLeft className="size-4 mr-2" />
            {t("backToLogin")}
          </Link>

          {step === 3 ? (
            // Success State
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="size-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {t("passwordResetComplete")}
              </h2>
              <p className="text-gray-500 mb-6">
                {t("passwordResetRedirecting")}
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="mb-10">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                  <Key className="size-6 text-emerald-600" />
                </div>
                <h2 className="text-gray-900 text-3xl font-extrabold tracking-tight mb-2">
                  {t("resetPassword")}
                </h2>
                <p className="text-emerald-600 text-base">
                  {step === 1
                    ? t("enterEmailForCode")
                    : t("enterCodeSentToEmail")}
                </p>
              </div>

              {step === 1 ? (
                <form onSubmit={handleSendCode} className="space-y-5">
                  <div>
                    <Label
                      htmlFor="email"
                      className="block text-sm font-semibold text-gray-900 mb-1.5"
                    >
                      {t("emailAddress")}
                    </Label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-emerald-600">
                        <Mail className="size-5" />
                      </span>
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-11 h-12 bg-gray-50 border-emerald-200 focus:ring-emerald-400 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                  >
                    {isLoading ? t("sending") : t("sendVerificationCode")}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleReset} className="space-y-5">
                  <div>
                    <Label
                      htmlFor="code"
                      className="block text-sm font-semibold text-gray-900 mb-1.5"
                    >
                      {t("verificationCode")}
                    </Label>
                    <Input
                      id="code"
                      placeholder="000000"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      required
                      className="h-12 bg-gray-50 border-emerald-200 focus:ring-emerald-400 focus:border-emerald-500 text-center text-lg tracking-widest"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {t("checkEmailForCode")}
                    </p>
                  </div>

                  <div>
                    <Label
                      htmlFor="newPassword"
                      className="block text-sm font-semibold text-gray-900 mb-1.5"
                    >
                      {t("newPassword")}
                    </Label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-emerald-600">
                        <Lock className="size-5" />
                      </span>
                      <Input
                        id="newPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="pl-11 pr-11 h-12 bg-gray-50 border-emerald-200 focus:ring-emerald-400 focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-emerald-500"
                      >
                        {showPassword ? (
                          <EyeOff className="size-5" />
                        ) : (
                          <Eye className="size-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                  >
                    {isLoading ? t("updating") : t("resetPassword")}
                  </Button>
                </form>
              )}
            </>
          )}

          <div className="mt-12 text-center text-xs text-gray-400">
            <p>© {new Date().getFullYear()} RootSphere AI Inc. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
