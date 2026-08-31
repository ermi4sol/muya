/** Shared product-type metadata — safe to import from server AND client code. */

export const PRODUCT_TYPES = [
  "digital_product",
  "lead_magnet",
  "coaching_call",
  "course",
  "webinar",
  "affiliate_link",
  "url_media",
  "physical",
  "custom_product",
] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number];

export const CARD_STYLES = ["button", "callout", "preview"] as const;
export type CardStyle = (typeof CARD_STYLES)[number];

export const TYPE_META: Record<
  ProductType,
  { icon: string; nameKey: string; descKey: string }
> = {
  digital_product: { icon: "📥", nameKey: "types.digital", descKey: "types.digitalDesc" },
  lead_magnet: { icon: "🎁", nameKey: "types.leadMagnet", descKey: "types.leadMagnetDesc" },
  coaching_call: { icon: "🗓️", nameKey: "types.coaching", descKey: "types.coachingDesc" },
  course: { icon: "🎓", nameKey: "types.course", descKey: "types.courseDesc" },
  webinar: { icon: "🎥", nameKey: "types.webinar", descKey: "types.webinarDesc" },
  affiliate_link: { icon: "🤝", nameKey: "types.affiliate", descKey: "types.affiliateDesc" },
  url_media: { icon: "🔗", nameKey: "types.urlMedia", descKey: "types.urlMediaDesc" },
  physical: { icon: "🛍️", nameKey: "types.physical", descKey: "types.physicalDesc" },
  custom_product: { icon: "✨", nameKey: "types.custom", descKey: "types.customDesc" },
};

/** Types that are free for the buyer (no price fields in the builder). */
export const FREE_TYPES: ProductType[] = ["lead_magnet"];

/** Types that link out instead of selling through MUYA checkout. */
export const LINK_OUT_TYPES: ProductType[] = ["affiliate_link", "url_media"];
