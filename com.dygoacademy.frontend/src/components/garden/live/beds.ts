import type { useTranslations } from "next-intl";

import type { SeedPacket, SeedPackets } from "@/types";

import type { SeedPacketView } from "../screens/SeedPacketsScreen";

type T = ReturnType<typeof useTranslations<"screens.seedPackets">>;

/** One packet's lines: collection · level · words, and why it was picked. */
export function packetView(
  p: SeedPacket,
  all: SeedPackets,
  t: T,
): SeedPacketView {
  const meta = p.level
    ? t("meta", {
        collection: p.collection,
        level: p.level,
        count: p.word_count,
      })
    : t("metaNoLevel", { collection: p.collection, count: p.word_count });
  const why =
    p.kind === "bee"
      ? t("why.bee", { count: p.known_count })
      : p.kind === "goal"
        ? all.target_band != null
          ? t("why.goalBand", { band: all.target_band })
          : t("why.goal")
        : t("why.new");
  return { id: p.topic_id, kind: p.kind, name: p.title, meta, why };
}
