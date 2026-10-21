import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  secondary: "bg-ink text-white hover:bg-black",
  ghost: "text-accent hover:underline underline-offset-4 px-0",
};

export function buttonClass(variant: Variant = "primary", extra = "") {
  return `${base} ${variants[variant]} ${extra}`;
}

export function ButtonLink({ variant = "primary", className = "", ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}
