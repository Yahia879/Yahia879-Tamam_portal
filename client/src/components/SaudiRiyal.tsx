import React from "react";

export interface SaudiRiyalProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  className?: string;
  size?: number | string;
}

export function SaudiRiyal({
  className = "w-4 h-4 inline-block align-middle",
  size,
  style,
  alt = "ريال",
  ...props
}: SaudiRiyalProps) {
  const customStyle: React.CSSProperties = {
    ...style,
    ...(size ? { width: size, height: size } : {}),
  };

  return (
    <img
      src="/riyal.png"
      alt={alt}
      className={`inline-block object-contain ${className}`}
      style={customStyle}
      {...props}
    />
  );
}

export const RiyalIcon = SaudiRiyal;
export default SaudiRiyal;
