import { useEffect, useRef, useState } from "react";

const HERO_MOSQUE_LQIP =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDARESEhgVGC8aGi9jQjhCY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wAARCAAbADADASIAAhEBAxEB/8QAGgAAAgMBAQAAAAAAAAAAAAAABAUAAgYBB//EACQQAAIBBAEEAgMAAAAAAAAAAAEDAgAEBRESBiExQSJRExRC/8QAFwEBAQEBAAAAAAAAAAAAAAAAAgEEAP/EABsRAQEBAAIDAAAAAAAAAAAAABEAAQMhAiIy/9oADAMBAAIRAxEAPwDz+pRarBrFRZ2ESdbNcu7FtswxPyA9jxXVCIwVsu6veDI8gATqhb5YVdshEaANN+lEzGQMpQIjwPfVAZhUjkGGMTrf1Qfap1L6ldII8jVXihklFgiTEeTTjby6sUxw2gsDidiqFFucaps9bj6Puns1wnaQjKIMT5FZ/qRcEohFY4j6FLk+Z7r5MVi7oOLFxjAAROtClL1uW6fKI0T22KYdPwiLbkB3Pk1fKAfjEtd6yBNckz8UbsgwWCdfzTnGYJccSEtWROZ+W6pgyf2RWjQSWM36NaOLvGKa3//Z";

const HERO_MASK_STYLE: React.CSSProperties = {
  objectPosition: "49.3% center",
  maskImage:
    "radial-gradient(ellipse 55% 70% at 50% 45%, rgba(0, 0, 0, 0.08) 18%, rgba(0, 0, 0, 0.5) 52%, black 82%)",
  WebkitMaskImage:
    "radial-gradient(ellipse 55% 70% at 50% 45%, rgba(0, 0, 0, 0.08) 18%, rgba(0, 0, 0, 0.5) 52%, black 82%)",
};

/**
 * Shared hero mosque backdrop with instant LQIP placeholder, WebP asset, and Z-depth masking.
 */
export function HeroMosqueBackdrop() {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Instant inline blurred placeholder while full-res WebP streams on cold cache */}
      {!loaded && (
        <img
          src={HERO_MOSQUE_LQIP}
          alt=""
          aria-hidden="true"
          className="absolute inset-y-0 -inset-x-[2%] w-[104%] max-w-none h-full object-cover opacity-50 blur-sm pointer-events-none lg:translate-x-[0.68%]"
          style={HERO_MASK_STYLE}
        />
      )}

      <picture>
        <source srcSet="/hero-mosque-hd.webp" type="image/webp" />
        <img
          ref={imgRef}
          src="/hero-mosque-hd.jpg"
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="sync"
          fetchPriority="high"
          onLoad={() => setLoaded(true)}
          className={`absolute inset-y-0 -inset-x-[2%] w-[104%] max-w-none h-full object-cover pointer-events-none lg:translate-x-[0.68%] transition-opacity duration-300 ${
            loaded ? "opacity-50" : "opacity-0"
          }`}
          style={HERO_MASK_STYLE}
        />
      </picture>

      {/* طبقة تدرج لوني لحماية التباين ووضوح النصوص */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(13, 148, 136, 0.25) 0%, rgba(15, 118, 110, 0.28) 55%, rgba(30, 64, 175, 0.38) 100%)",
        }}
      />
      <div className="absolute inset-0 opacity-5 pointer-events-none islamic-pattern" />
    </div>
  );
}
