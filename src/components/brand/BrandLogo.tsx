import darkLogo from "@/assets/brand/artistrysynk-logo-dark.png.asset.json";
import whiteLogo from "@/assets/brand/artistrysynk-logo-white-transparent.png";
import { cn } from "@/lib/utils";

export function BrandLogo({ surface = "dark", className }: {
  surface?: "light" | "dark";
  className?: string;
}) {
  return <img src={surface === "light" ? darkLogo.url : whiteLogo} alt="ArtistrySynk — Connect, Create, Collaborate" className={cn("aspect-[4/1] object-contain", className)} />;
}