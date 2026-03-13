import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCarouselSlides } from "@/hooks/useCarouselSlides";

interface HeroCarouselProps {
  onCtaClick?: () => void;
}

export function HeroCarousel({ onCtaClick }: HeroCarouselProps) {
  const { data: slides = [] } = useCarouselSlides();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 5000, stopOnInteraction: false }),
  ]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", () => setSelectedIndex(emblaApi.selectedScrollSnap()));
  }, [emblaApi]);

  if (slides.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-lg">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {slides.map((slide) => (
            <div key={slide.id} className="flex-none w-full">
              <div
                className={cn(
                  "relative h-52 sm:h-64 md:h-80 bg-gradient-to-r flex items-center overflow-hidden",
                  slide.bg_gradient ?? "from-orange-500 via-orange-400 to-amber-300"
                )}
                style={
                  slide.image_url
                    ? { backgroundImage: `url(${slide.image_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                    : undefined
                }
              >
                {slide.image_url && <div className="absolute inset-0 bg-black/40" />}

                {/* Decoração geométrica */}
                <div className="absolute right-0 top-0 w-1/2 h-full opacity-10 pointer-events-none">
                  <div className="absolute right-10 top-10 w-64 h-64 rounded-full bg-white" />
                  <div className="absolute right-32 bottom-10 w-40 h-40 rounded-full bg-white" />
                </div>

                <div className="relative z-10 px-8 sm:px-12 max-w-2xl">
                  <h2 className="text-xl sm:text-2xl md:text-4xl font-extrabold text-white leading-tight mb-2">
                    {slide.title}
                  </h2>
                  {slide.subtitle && (
                    <p className="text-white/85 text-sm sm:text-base mb-5 max-w-md leading-relaxed">
                      {slide.subtitle}
                    </p>
                  )}
                  {onCtaClick && (
                    <button
                      onClick={onCtaClick}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-card text-foreground font-bold rounded-xl text-sm hover:bg-card/90 transition-all shadow-md"
                    >
                      {slide.cta_text ?? "Ver Catálogo"} →
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <Button
            onClick={scrollPrev}
            size="icon"
            variant="ghost"
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm rounded-full h-9 w-9"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            onClick={scrollNext}
            size="icon"
            variant="ghost"
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm rounded-full h-9 w-9"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollTo(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === selectedIndex ? "w-6 bg-white" : "w-1.5 bg-white/50"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
