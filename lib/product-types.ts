/** Shared product-type metadata — safe to import from server AND client code. */
export const TYPE_META: Record<
  string,
  { icon: string; nameKey: string; descKey: string }
> = {
  digital_download: { icon: "📥", nameKey: "landing2.p1", descKey: "builder.td1" },
  course: { icon: "🎓", nameKey: "landing2.p2", descKey: "builder.td2" },
  coaching_call: { icon: "🗓️", nameKey: "landing2.p3", descKey: "builder.td3" },
  webinar: { icon: "🎥", nameKey: "landing2.p4", descKey: "builder.td4" },
  membership: { icon: "⭐", nameKey: "landing2.p5", descKey: "builder.td5" },
  lead_magnet: { icon: "🎁", nameKey: "landing2.p6", descKey: "builder.td6" },
  custom_product: { icon: "✨", nameKey: "landing2.p7", descKey: "builder.td7" },
  external_link: { icon: "🔗", nameKey: "landing2.p8", descKey: "builder.td8" },
  community: { icon: "💬", nameKey: "landing2.p9", descKey: "builder.td9" },
  physical: { icon: "🛍️", nameKey: "landing2.p10", descKey: "builder.td10" },
};
