"use client";

import Link from "next/link";

export function LegalFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0a4a68] text-white" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Main Content */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
          {/* Brand */}
          <div className="text-center md:text-right">
            <img src="https://bcare.com.sa/assets/images/logo-bacre-white.svg" />{" "}
            <p className="text-gray-300 text-xs">
              © {currentYear} جميع الحقوق محفوظة
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-4 text-xs">
            <Link
              href="/privacy"
              className="text-gray-300 hover:text-yellow-400 transition-colors"
            >
              الخصوصية
            </Link>
            <span className="text-gray-500">•</span>
            <Link
              href="/terms"
              className="text-gray-300 hover:text-yellow-400 transition-colors"
            >
              الشروط
            </Link>
            <span className="text-gray-500">•</span>
            <Link
              href="/cookies"
              className="text-gray-300 hover:text-yellow-400 transition-colors"
            >
              الكوكيز
            </Link>
            <span className="text-gray-500">•</span>
            <button
              onClick={() => {
                localStorage.removeItem("cookie_consent");
                window.location.reload();
              }}
              className="text-gray-300 hover:text-yellow-400 transition-colors"
            >
              إعدادات الكوكيز
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
