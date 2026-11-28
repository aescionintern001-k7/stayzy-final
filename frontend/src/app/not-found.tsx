import Link from "next/link";
import { Search, Home } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-[#FAF6EC]">
      <div className="max-w-md w-full bg-white rounded-[24px] border border-[#E9E3D5] shadow-sm p-8 text-center space-y-5">
        <span className="inline-block px-3 py-1 rounded-full bg-[#EAF5E4] text-[#064E38] border border-[#CBE4C3] text-xs font-extrabold tracking-wider uppercase">
          404 · Page Not Found
        </span>
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-[#064E38]">
            We couldn&apos;t find that stay
          </h1>
          <p className="text-sm text-[#5E6E65]">
            The page you requested may have moved or is no longer available.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/rooms"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#064E38] text-white text-sm font-bold hover:bg-[#053D2C] transition-colors"
          >
            <Search className="w-4 h-4" />
            Explore Stays
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-[#D5E9CE] text-[#064E38] text-sm font-bold hover:bg-[#EAF5E4] transition-colors"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
        </div>
      </div>
    </main>
  );
}
