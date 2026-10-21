import { z } from "zod";
import { optionCatalog } from "@/config/options";
import { getProduct, productOrder, type Product, type ProductSlug } from "@/config/products";

const rectangleSize = z.object({
  shape: z.literal("rectangle"),
  lengthBoards: z.int(),
  widthBoardsPerSide: z.int(),
});

const octagonSize = z.object({
  shape: z.literal("octagon"),
  sizeId: z.string(),
});

export const configurationSchema = z
  .object({
    product: z.enum(productOrder as [ProductSlug, ...ProductSlug[]]),
    size: z.discriminatedUnion("shape", [rectangleSize, octagonSize]),
    boardHeight: z.number().positive(),
    /** Cage variants only; null otherwise. */
    barHeight: z.number().positive().nullable(),
    goal: z.enum(optionCatalog.goalTypes),
    /** Net behind each goal, total height in metres; 0 = none. */
    fencingHeight: z.number().min(0),
    branding: z.object({
      coverage: z.enum(optionCatalog.brandingCoverage),
      /** Number of boards carrying a logo when coverage = "logos". */
      boards: z.int().min(0),
      sides: z.union([z.literal(1), z.literal(2)]),
      logoUploadId: z.uuid().nullable(),
    }),
    finish: z.object({
      type: z.enum(optionCatalog.finishes),
      ral: z.string().max(20).nullable(),
    }),
    surface: z.enum(optionCatalog.surfaces),
    extras: z.object({
      transportCart: z.boolean(),
      storageBags: z.boolean(),
      installation: z.boolean(),
    }),
    quantity: z.int().min(1).max(optionCatalog.maxQuantity),
  })
  .superRefine((config, ctx) => {
    const product = getProduct(config.product);
    if (!product) return;
    for (const issue of productIssues(product, config)) {
      ctx.addIssue({ code: "custom", message: issue.message, path: issue.path });
    }
  });

export type Configuration = z.infer<typeof configurationSchema>;

interface Issue {
  path: string[];
  message: string;
}

function productIssues(product: Product, c: Configuration): Issue[] {
  const issues: Issue[] = [];
  const within = (v: number, min: number, max: number) => Number.isInteger(v) && v >= min && v <= max;

  if (product.shape === "rectangle") {
    const { lengthBoards, widthBoardsPerSide } = product.layout;
    if (c.size.shape !== "rectangle") {
      issues.push({ path: ["size"], message: "Rectangle size required" });
    } else {
      if (!within(c.size.lengthBoards, lengthBoards.min, lengthBoards.max))
        issues.push({ path: ["size", "lengthBoards"], message: "Length out of range" });
      if (!within(c.size.widthBoardsPerSide, widthBoardsPerSide.min, widthBoardsPerSide.max))
        issues.push({ path: ["size", "widthBoardsPerSide"], message: "Width out of range" });
    }
  } else if (c.size.shape !== "octagon" || !product.layout.sizes.some((s) => s.id === (c.size as { sizeId: string }).sizeId)) {
    issues.push({ path: ["size"], message: "Unknown octagon size" });
  }

  if (!product.boardHeight.options.includes(c.boardHeight))
    issues.push({ path: ["boardHeight"], message: "Board height not offered" });

  if (product.cage) {
    if (c.barHeight === null || !product.cage.barHeight.options.includes(c.barHeight))
      issues.push({ path: ["barHeight"], message: "Bar height not offered" });
  } else if (c.barHeight !== null) {
    issues.push({ path: ["barHeight"], message: "Bars only on cage variants" });
  }

  if (c.fencingHeight !== 0) {
    if (!product.allows.fencing) issues.push({ path: ["fencingHeight"], message: "Fencing not offered" });
    else if (!optionCatalog.fencingHeights.includes(c.fencingHeight))
      issues.push({ path: ["fencingHeight"], message: "Fencing height not offered" });
  }

  if (c.surface === "turf" && !product.allows.turf) issues.push({ path: ["surface"], message: "Turf not offered" });

  if (c.branding.coverage === "logos" && c.branding.boards < 1)
    issues.push({ path: ["branding", "boards"], message: "Choose at least one board" });

  if (c.finish.type === "powder" && !c.finish.ral)
    issues.push({ path: ["finish", "ral"], message: "Choose a colour" });

  return issues;
}

/** The standard configuration — reproduces the catalog price. */
export function defaultConfiguration(slug: ProductSlug): Configuration {
  const product = getProduct(slug);
  if (!product) throw new Error(`Unknown product ${slug}`);
  return {
    product: slug,
    size:
      product.shape === "rectangle"
        ? {
            shape: "rectangle",
            lengthBoards: product.layout.lengthBoards.default,
            widthBoardsPerSide: product.layout.widthBoardsPerSide.default,
          }
        : { shape: "octagon", sizeId: product.layout.defaultSize },
    boardHeight: product.boardHeight.default,
    barHeight: product.cage ? product.cage.barHeight.default : null,
    goal: "standard",
    fencingHeight: 0,
    branding: { coverage: "none", boards: 0, sides: 1, logoUploadId: null },
    finish: { type: "galvanized", ral: null },
    surface: "none",
    extras: { transportCart: false, storageBags: false, installation: false },
    quantity: 1,
  };
}
