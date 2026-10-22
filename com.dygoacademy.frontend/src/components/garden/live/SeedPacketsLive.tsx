"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { GARDEN_ROUTES } from "@/constants/garden";
import { usePlantBed, useSeedPackets } from "@/hooks/useBeds";

import { SeedPacketsScreen } from "../screens/SeedPacketsScreen";
import { packetView } from "./beds";
import { LiveError, LiveLoading } from "./LiveState";

/**
 * /topics/[id]/packets: S3 from GET /beds/packets; the first packet starts
 * selected, as on the board. "Plant <bed>" calls POST /beds and opens the
 * new bed (A7). Back returns to the harvest of bed `topicId`.
 */
export function SeedPacketsLive({ topicId }: { topicId: string }) {
  const t = useTranslations("screens.seedPackets");
  const router = useRouter();
  const packets = useSeedPackets();
  const plant = usePlantBed();
  const [picked, setPicked] = React.useState<string | null>(null);

  if (packets.isPending) return <LiveLoading />;
  if (packets.isError || !packets.data)
    return <LiveError onRetry={() => void packets.refetch()} />;

  const views = packets.data.packets.map((p) => packetView(p, packets.data, t));
  const selectedId = picked ?? views[0]?.id ?? null;

  async function onPlant() {
    if (!selectedId) return;
    try {
      await plant.mutateAsync(selectedId);
      router.push(GARDEN_ROUTES.topic(selectedId));
    } catch {
      // The error line shows under the button.
    }
  }

  return (
    <SeedPacketsScreen
      backHref={GARDEN_ROUTES.bedHarvest(topicId)}
      browseHref={GARDEN_ROUTES.topics}
      packets={views}
      selectedId={selectedId}
      onSelect={setPicked}
      onPlant={() => void onPlant()}
      planting={plant.isPending}
      error={
        plant.isError ? t("error") : views.length === 0 ? t("empty") : null
      }
    />
  );
}
