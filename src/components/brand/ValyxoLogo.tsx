import Image from "next/image";
import { cn } from "@/lib/utils";

type ValyxoLogoProps = {
  size?: number;        // px (høyde)
  className?: string;
  priority?: boolean;
};

export function ValyxoLogo({
  size = 40,            // ⬅️ større default
  className,
  priority = false,
}: ValyxoLogoProps) {
  return (
    <Image
      src="/favicon.svg"
      alt="Valyxo"
      height={size}
      width={size * 4.0} // ⬅️ logo
      priority={priority}
      className={cn(
        "select-none object-contain opacity-100",
        className
      )}
    />
  );
}
