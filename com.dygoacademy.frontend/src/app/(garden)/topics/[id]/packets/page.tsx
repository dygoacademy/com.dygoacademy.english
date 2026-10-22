import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SeedPacketsLive } from "@/components/garden/live/SeedPacketsLive";

/** Seeds & Harvest S3: pick the next bed after harvesting this one. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("garden.pages");
  return { title: t("seedPackets") };
}

export default async function GardenSeedPacketsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SeedPacketsLive topicId={id} />;
}
