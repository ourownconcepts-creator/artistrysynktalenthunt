import { cn } from "@/lib/utils";

export function Wordmark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const scale = size === "sm" ? "text-base" : size === "lg" ? "text-3xl" : "text-xl";

  return (
    <span className={cn("inline-flex items-baseline gap-1.5 font-display leading-none", className)}>
      <span className={cn(scale, "text-gold")}>ZIK&rsquo;S</span>
      <span className={cn(scale, "text-foreground")}>GOT</span>
      <span className={cn(scale, "text-heat")}>TALENT</span>
    </span>
  );
}
