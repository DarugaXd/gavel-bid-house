import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function ImageCarousel({
  images,
  alt,
  className = "",
  aspect = "aspect-[4/3]",
}: {
  images: string[];
  alt: string;
  className?: string;
  aspect?: string;
}) {
  const [i, setI] = useState(0);
  const list = images.filter(Boolean);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    if (i >= list.length) setI(0);
  }, [list.length, i]);

  if (list.length === 0) {
    return (
      <div
        className={
          "rounded-lg border border-border bg-muted flex items-center justify-center text-muted-foreground " +
          aspect +
          " " +
          className
        }
      >
        No image
      </div>
    );
  }

  const go = (delta: number) => setI((p) => (p + delta + list.length) % list.length);

  return (
    <div className={"relative overflow-hidden rounded-lg border border-border bg-muted " + className}>
      <div
        className={"relative " + aspect}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        {list.map((src, idx) => (
          <img
            key={src + idx}
            src={src}
            alt={`${alt} — image ${idx + 1}`}
            loading={idx === 0 ? "eager" : "lazy"}
            className={
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-500 " +
              (idx === i ? "opacity-100" : "opacity-0")
            }
          />
        ))}
      </div>

      {list.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous image"
            onClick={() => go(-1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-background/85 text-primary shadow backdrop-blur hover:bg-background"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={() => go(1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-background/85 text-primary shadow backdrop-blur hover:bg-background"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {list.map((_, idx) => (
              <button
                key={idx}
                aria-label={`Go to image ${idx + 1}`}
                onClick={() => setI(idx)}
                className={
                  "h-1.5 rounded-full transition-all " +
                  (idx === i ? "w-6 bg-primary" : "w-1.5 bg-background/70 hover:bg-background")
                }
              />
            ))}
          </div>
          <div className="absolute top-3 right-3 rounded-md bg-background/85 px-2 py-0.5 text-[11px] font-medium text-primary backdrop-blur">
            {i + 1} / {list.length}
          </div>
        </>
      )}
    </div>
  );
}
