"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="btn btn-outline btn-sm text-xs flex items-center gap-1.5 font-semibold transition-all duration-200 hover:bg-teal-50 hover:text-teal-700 border-stone-200 print:hidden"
      type="button"
      title="Print / Save as PDF"
    >
      <Printer className="w-3.5 h-3.5" />
      Print / Save as PDF
    </button>
  );
}
