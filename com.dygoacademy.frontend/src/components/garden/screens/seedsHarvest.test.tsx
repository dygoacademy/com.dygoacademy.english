import { fireEvent, screen } from "@testing-library/react";
import { useTranslations } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { packetView } from "@/components/garden/live/beds";
import { renderWithIntl } from "@/test/render";
import type { SeedPacket, SeedPackets } from "@/types";

import { BedHarvestScreen } from "./BedHarvestScreen";
import { SeedPacketsScreen, type SeedPacketView } from "./SeedPacketsScreen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const WORDS = [
  { id: "w1", word: "mitigate", stage: "fruit" as const },
  { id: "w2", word: "emission", stage: "ripe" as const },
  { id: "w3", word: "renewable", stage: "growing" as const },
];

describe("BedHarvestScreen (S2)", () => {
  it("shows the first harvest, the tiles, the basket by stage and the next bed link", () => {
    const onShare = vi.fn();
    renderWithIntl(
      <BedHarvestScreen
        closeHref="/garden"
        packetsHref="/topics/t1/packets"
        bed="Environment"
        firstHarvest
        fruit={1}
        stillGrowing={2}
        words={WORDS}
        onShare={onShare}
      />,
    );
    expect(screen.getByText("Environment · fully planted")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Your first harvest" }),
    ).toBeTruthy();
    expect(screen.getByText("words grown").previousSibling?.textContent).toBe(
      "3",
    );
    expect(screen.getByText("still growing").previousSibling?.textContent).toBe(
      "2",
    );
    expect(
      screen.getByText("mitigate").closest("li")?.getAttribute("data-stage"),
    ).toBe("fruit");
    expect(
      screen.getByText("emission").closest("li")?.getAttribute("data-stage"),
    ).toBe("ripe");
    expect(
      screen
        .getByRole("link", { name: "Choose next bed" })
        .getAttribute("href"),
    ).toBe("/topics/t1/packets");
    expect(
      screen.getByRole("link", { name: "Close" }).getAttribute("href"),
    ).toBe("/garden");
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(onShare).toHaveBeenCalled();
  });

  it("a later harvest has the plain title, and Share says Copied after a copy", () => {
    renderWithIntl(
      <BedHarvestScreen
        closeHref="/garden"
        packetsHref="/p"
        bed="Travel"
        firstHarvest={false}
        fruit={0}
        stillGrowing={3}
        words={WORDS}
        onShare={() => {}}
        copied
      />,
    );
    expect(screen.getByRole("heading", { name: "Your harvest" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copied" })).toBeTruthy();
  });
});

const PACKETS: SeedPacketView[] = [
  {
    id: "a",
    kind: "bee",
    name: "Climate policy",
    meta: "IELTS Academic · B2 · 32 words",
    why: "6 words already growing",
  },
  {
    id: "b",
    kind: "goal",
    name: "Urban life",
    meta: "IELTS Academic · B2 · 40 words",
    why: "Next on your Road to Band 7",
  },
];

describe("SeedPacketsScreen (S3)", () => {
  it("is a radio group; the button plants the picked packet", () => {
    const onSelect = vi.fn();
    const onPlant = vi.fn();
    renderWithIntl(
      <SeedPacketsScreen
        backHref="/topics/t1/harvest"
        browseHref="/topics"
        packets={PACKETS}
        selectedId="a"
        onSelect={onSelect}
        onPlant={onPlant}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Pick a seed packet" }),
    ).toBeTruthy();
    const radios = screen.getAllByRole("radio");
    expect(radios.map((r) => r.getAttribute("aria-checked"))).toEqual([
      "true",
      "false",
    ]);
    expect(screen.getByText("Follow the bee")).toBeTruthy();
    fireEvent.click(radios[1]);
    expect(onSelect).toHaveBeenCalledWith("b");
    fireEvent.click(
      screen.getByRole("button", { name: "Plant Climate policy" }),
    );
    expect(onPlant).toHaveBeenCalled();
    expect(
      screen
        .getByRole("link", { name: "Browse all topics" })
        .getAttribute("href"),
    ).toBe("/topics");
  });

  it("with no packets the button is off and the empty line shows", () => {
    renderWithIntl(
      <SeedPacketsScreen
        backHref="/b"
        browseHref="/topics"
        packets={[]}
        selectedId={null}
        onSelect={() => {}}
        onPlant={() => {}}
        error="No new beds to pick right now. Browse all topics to find one."
      />,
    );
    expect(
      (
        screen.getByRole("button", {
          name: "Pick a packet",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(screen.getByRole("alert").textContent).toMatch(/No new beds/);
  });
});

const packet = (over: Partial<SeedPacket>): SeedPacket => ({
  kind: "bee",
  topic_id: "t",
  title: "Climate policy",
  collection: "IELTS Academic",
  level: "B2",
  word_count: 32,
  known_count: 6,
  ...over,
});

function Lines({ p, all }: { p: SeedPacket; all: SeedPackets }) {
  const t = useTranslations("screens.seedPackets");
  const v = packetView(p, all, t);
  return (
    <p>
      {v.meta} | {v.why}
    </p>
  );
}

describe("packetView (S3 packet lines)", () => {
  const all: SeedPackets = { packets: [], study_goal: "IELTS", target_band: 7 };
  it.each([
    [
      packet({}),
      all,
      "IELTS Academic · B2 · 32 words | 6 words already growing",
    ],
    [
      packet({ kind: "goal", level: "B1–B2" }),
      all,
      "IELTS Academic · B1–B2 · 32 words | Next on your Road to Band 7",
    ],
    [
      packet({ kind: "goal", level: null, word_count: 1 }),
      { ...all, target_band: null },
      "IELTS Academic · 1 word | Next for your goal",
    ],
    [
      packet({ kind: "new", known_count: 1 }),
      all,
      "IELTS Academic · B2 · 32 words | A new interest",
    ],
  ])("%#", (p, a, text) => {
    renderWithIntl(<Lines p={p} all={a} />);
    expect(screen.getByText(text)).toBeTruthy();
  });
});
