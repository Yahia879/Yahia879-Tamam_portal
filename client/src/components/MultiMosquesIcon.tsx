import React from "react";

export function MultiMosquesIcon({ className = "w-5 h-5", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Base Line */}
      <path d="M2 21h20" />
      
      {/* First Mosque (Left) */}
      <path d="M3 21v-7c0-.6.4-1 1-1h4c.6 0 1 .4 1 1v7" />
      <path d="M6 7.5C4.8 9 4.5 11 4.5 13h3c0-2-.3-4-1.5-5.5z" />
      <path d="M6 7.5V4.5" />
      <circle cx="6" cy="3.5" r="0.75" fill="currentColor" />

      {/* Second Mosque (Right - Slightly Larger) */}
      <path d="M13 21v-9c0-.6.4-1 1-1h5c.6 0 1 .4 1 1v9" />
      <path d="M16.5 5.5C15 7.2 14.5 9.5 14.5 11h4c0-1.5-.5-3.8-2-5.5z" />
      <path d="M16.5 5.5V2.5" />
      <circle cx="16.5" cy="1.5" r="0.75" fill="currentColor" />

      {/* Minaret / Spire in between */}
      <path d="M10 21v-9h1.5v9" />
      <path d="M10.75 12V9.5" />
      <circle cx="10.75" cy="8.75" r="0.5" fill="currentColor" />
    </svg>
  );
}

export default MultiMosquesIcon;
