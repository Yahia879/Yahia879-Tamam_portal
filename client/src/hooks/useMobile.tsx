import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile(includeTablet = false) {
  const query = includeTablet
    ? "(width < 1024px), (pointer: coarse) and (max-width: 1366px)"
    : `(width < ${MOBILE_BREAKPOINT}px)`;
  const [isMobile, setIsMobile] = React.useState(() =>
    typeof window !== "undefined" && window.matchMedia(query).matches
  );

  React.useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => {
      setIsMobile(mql.matches);
    };
    mql.addEventListener("change", onChange);
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return isMobile;
}
