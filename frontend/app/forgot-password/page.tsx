"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import API from "../../utils/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isResetMode, setIsResetMode] = useState(false);
  
  // URL parameters for Mode B
  const [token, setToken] = useState("");
  const [emailParam, setEmailParam] = useState("");

  // Input states
  const [emailInput, setEmailInput] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Visibility toggle
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [redirectCount, setRedirectCount] = useState(3);

  // Check URL parameters on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const urlToken = searchParams.get("token");
      const urlEmail = searchParams.get("email");

      if (urlToken && urlEmail) {
        setIsResetMode(true);
        setToken(urlToken);
        setEmailParam(urlEmail);
      }
    }
  }, []);

  // Countdown redirect helper
  useEffect(() => {
    if (success && isResetMode && redirectCount > 0) {
      const timer = setTimeout(() => {
        setRedirectCount(redirectCount - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (success && isResetMode && redirectCount === 0) {
      router.push("/login");
    }
  }, [success, redirectCount, isResetMode, router]);

  // Password Strength Checklist Calculation
  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[@$!%*?&#]/.test(password),
  };

  const metCount = Object.values(checks).filter(Boolean).length;
  let strengthLabel = "Weak";
  let strengthColor = "text-red-400 bg-red-950/30 border-red-500/20";
  let barColor = "bg-red-500 w-1/3";

  if (metCount === 5) {
    strengthLabel = "Strong";
    strengthColor = "text-green-400 bg-green-950/30 border-green-500/20";
    barColor = "bg-green-500 w-full";
  } else if (metCount >= 3) {
    strengthLabel = "Medium";
    strengthColor = "text-yellow-400 bg-yellow-950/30 border-yellow-500/20";
    barColor = "bg-yellow-500 w-2/3";
  }

  // Handle Mode A: Request Link
  const handleRequestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) {
      setError("Please provide your email address.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await API.post("/auth/forgot-password", { email: emailInput });
      setSuccess(response.data.message || "If the account exists, a reset link has been sent.");
      setEmailInput("");
    } catch (err: any) {
      console.error(err);
      if (err.code === "ERR_NETWORK" || !err.response) {
        setError("Unable to contact authentication service.");
      } else {
        setError(err.response?.data?.message || "Failed to process request. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Mode B: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (metCount < 5) {
      setError("Password does not meet all complexity requirements.");
      return;
    }

    setLoading(true);

    try {
      const response = await API.post("/auth/reset-password", {
        email: emailParam,
        token,
        password,
      });
      setSuccess(response.data.message || "Password reset successfully.");
    } catch (err: any) {
      console.error(err);
      if (err.code === "ERR_NETWORK" || !err.response) {
        setError("Unable to contact authentication service.");
      } else {
        setError(err.response?.data?.message || "Invalid or expired reset link.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/10 rounded-full blur-[120px]" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center">
        <div className="flex justify-center mb-6">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <span className="text-white text-2xl font-bold">CG</span>
          </div>
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          CivicGuard Operations
        </h2>
        <p className="mt-2 text-sm text-gray-400 font-medium">
          Municipal Risk Intelligence Platform
        </p>
        <h3 className="mt-4 text-base font-bold text-gray-200">
          {isResetMode ? "Reset Account Password" : "Reset Credentials Console"}
        </h3>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-neutral-900/60 backdrop-blur-md border border-white/10 py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10">
          {error && (
            <div className="mb-4 bg-red-950/50 border border-red-500/30 text-red-200 text-sm p-3 rounded-lg flex items-center gap-2">
              <span className="text-red-400">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-950/50 border border-green-500/30 text-green-200 text-sm p-3 rounded-lg flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-green-400">✅</span>
                <span>{success}</span>
              </div>
              {isResetMode && (
                <span className="text-xs text-green-300/80 mt-1">
                  Redirecting to login in {redirectCount} second(s)...
                </span>
              )}
            </div>
          )}

          {!isResetMode ? (
            /* =================================================
               MODE A: REQUEST LINK FORM
            ================================================= */
            <form className="space-y-6" onSubmit={handleRequestLink}>
              <p className="text-xs text-gray-400 leading-relaxed">
                Enter your registered official email address below. We will send a secure password reset link valid for 1 hour.
              </p>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-300"
                >
                  Official Email Address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-white/10 rounded-lg bg-neutral-950 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 text-sm transition-all"
                    placeholder="e.g. officer@civicguard.gov"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading || !!success}
                  className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sending link...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* =================================================
               MODE B: RESET PASSWORD FORM
            ================================================= */
            <form className="space-y-6" onSubmit={handleResetPassword}>
              <div className="bg-neutral-950/50 border border-white/5 p-3 rounded-lg">
                <span className="text-[11px] text-gray-500 block">Resetting password for:</span>
                <span className="text-sm font-semibold text-gray-300 block truncate">{emailParam}</span>
              </div>

              <div>
                <label
                  htmlFor="new-password"
                  className="block text-sm font-medium text-gray-300"
                >
                  New Password
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    id="new-password"
                    name="new-password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 pr-10 border border-white/10 rounded-lg bg-neutral-950 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 text-sm transition-all"
                    placeholder="Minimum 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Password Strength Meter & Checklist */}
              {password.length > 0 && (
                <div className="space-y-3 bg-neutral-950/40 p-3 rounded-lg border border-white/5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">Password Strength:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${strengthColor}`}>
                      {strengthLabel}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-neutral-800 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-300 ${barColor}`} />
                  </div>
                  
                  {/* Validation Checklist */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className={checks.length ? "text-green-500" : "text-gray-600"}>
                        {checks.length ? "✓" : "○"}
                      </span>
                      <span className={checks.length ? "text-gray-300" : "text-gray-500"}>8+ characters</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={checks.upper ? "text-green-500" : "text-gray-600"}>
                        {checks.upper ? "✓" : "○"}
                      </span>
                      <span className={checks.upper ? "text-gray-300" : "text-gray-500"}>1 uppercase letter</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={checks.lower ? "text-green-500" : "text-gray-600"}>
                        {checks.lower ? "✓" : "○"}
                      </span>
                      <span className={checks.lower ? "text-gray-300" : "text-gray-500"}>1 lowercase letter</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={checks.number ? "text-green-500" : "text-gray-600"}>
                        {checks.number ? "✓" : "○"}
                      </span>
                      <span className={checks.number ? "text-gray-300" : "text-gray-500"}>1 number</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:col-span-2">
                      <span className={checks.special ? "text-green-500" : "text-gray-600"}>
                        {checks.special ? "✓" : "○"}
                      </span>
                      <span className={checks.special ? "text-gray-300" : "text-gray-500"}>
                        1 special char (@$!%*?&#)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-sm font-medium text-gray-300"
                >
                  Confirm New Password
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    id="confirm-password"
                    name="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 pr-10 border border-white/10 rounded-lg bg-neutral-950 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 text-sm transition-all"
                    placeholder="Repeat new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white focus:outline-none"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading || !!success}
                  className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Resetting password...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center pt-2 border-t border-white/5">
            <Link
              href="/login"
              className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors"
            >
              ← Back to login console
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-gray-600 z-10">
        <p className="font-semibold text-gray-500">CivicGuard v1.0</p>
        <p className="mt-0.5">Secure Municipal Operations Platform</p>
      </div>
    </div>
  );
}
