import { cn } from "@/lib/utils";
import { BrandLogo } from "./BrandLogo";

export function Wordmark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const scale = size === "sm" ? "w-36" : size === "lg" ? "w-64" : "w-44 sm:w-48";
  const sub = size === "sm" ? "text-[9px]" : size === "lg" ? "text-xs" : "text-[10px]";

  return (
    <span className={cn("inline-flex flex-col leading-none font-display", className)}>
      <BrandLogo className={scale} />
      <span
        className={cn(
          sub,
          "mt-2 font-sans font-extrabold uppercase tracking-normal text-muted-foreground",
        )}
      >
        Creatives Talent Hunt
      </span>
    </span>
  );
}
