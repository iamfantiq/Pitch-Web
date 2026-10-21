import Image from "next/image";
import type { Product } from "@/config/products";
import { defaultConfiguration } from "@/lib/pricing/schema";
import { PitchIllustration } from "./PitchIllustration";

interface Props {
  product: Product;
  className?: string;
  priority?: boolean;
  sizes?: string;
}

/** Product photo if one is configured, otherwise a drawing of the standard configuration. */
export function ProductVisual({ product, className, priority, sizes = "(min-width: 1024px) 50vw, 100vw" }: Props) {
  if (product.photo) {
    return (
      <div className={`relative ${className ?? ""}`}>
        <Image src={product.photo} alt={product.name} fill priority={priority} sizes={sizes} className="object-cover" />
      </div>
    );
  }
  return <PitchIllustration config={defaultConfiguration(product.slug)} title={product.name} className={className} />;
}
