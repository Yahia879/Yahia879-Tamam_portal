import React from "react";

export function MultiMosquesIcon({ className = "w-5 h-5", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Ground baseline */}
      <path d="M1.5 21.5h21" />

      {/* --- Left Mosque --- */}
      {/* Minaret 1 (Far Left) */}
      <path d="M3 21.5V11h2v10.5" />
      <path d="M2.5 11h3" />
      <path d="M4 11V8.5" />
      <circle cx="4" cy="7.2" r="0.6" fill="currentColor" />

      {/* Mosque 1 Structure & Dome */}
      <path d="M5 21.5V14h5v7.5" />
      <path d="M5 14c0-2.5 1-4.5 2.5-5.5 1.5 1 2.5 3 2.5 5.5" />
      {/* Crescent/Finial 1 */}
      <path d="M7.5 8.5V6.5" />
      <circle cx="7.5" cy="5.5" r="0.6" fill="currentColor" />
      {/* Arch door 1 */}
      <path d="M6.5 21.5v-2.5c0-.6.4-1 1-1s1 .4 1 1v2.5" />

      {/* --- Right Mosque (Slightly taller / offset) --- */}
      {/* Mosque 2 Structure & Dome */}
      <path d="M12 21.5V13h7v8.5" />
      <path d="M12 13c0-3 1.5-5.5 3.5-6.5 2 1 3.5 3.5 3.5 6.5" />
      {/* Crescent/Finial 2 */}
      <path d="M15.5 6.5V4" />
      <circle cx="15.5" cy="3" r="0.6" fill="currentColor" />
      {/* Arch door 2 */}
      <path d="M14.5 21.5v-3c0-.8.5-1.5 1-1.5s1 .7 1 1.5v3" />

      {/* Minaret 2 (Far Right) */}
      <path d="M19 21.5V9h2v12.5" />
      <path d="M18.5 9h3" />
      <path d="M20 9V6.5" />
      <circle cx="20" cy="5.2" r="0.6" fill="currentColor" />
    </svg>
  );
}

export default MultiMosquesIcon;
