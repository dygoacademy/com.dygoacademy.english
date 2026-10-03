import type { MEANING_LOCALES } from '@/i18n/config';

/**
 * Home page HP-8 · the five use-case beds of "What do you need English
 * for?" (Phase 12 plan, *Home page v2*; references `H3-home-v2-phone`,
 * `H4-home-v2-desktop`, `H3s-uses-travel`, each also `-vi`, f254fbd).
 * Each bed has 5 English words with the plant stage the canvas draws and
 * the meaning in the page language for vi-VN and zh-CN (en-US shows no
 * meaning line). The Vietnamese meanings were checked by Dylan at G-home
 * (2026-10-03); the Chinese ones are drafts (decision 8).
 *
 * Honesty (decision 15): only Study & IELTS exists as a ready-made bed
 * today, so `ready: false` beds carry a "Coming soon" badge and the
 * "Until then, start with your own words." line. Flip `ready` once a bed is
 * seeded on UAT. "My own words" has no words: five empty seed tiles.
 */
export type UseCaseBedKey = 'work' | 'study' | 'travel' | 'daily' | 'own';

/** The tab order of the canvas; `work` is the default. */
export const USE_CASE_BED_KEYS: readonly UseCaseBedKey[] = ['work', 'study', 'travel', 'daily', 'own'];

export type UseCasePlantStage = 'seed' | 'sprout' | 'flower' | 'tree';

export interface UseCaseWord {
  word: string;
  /** The plant drawn on the tile (canvas order). */
  stage: UseCasePlantStage;
  meaning: Record<(typeof MEANING_LOCALES)[number], string>;
}

export interface UseCaseBed {
  key: UseCaseBedKey;
  /** A ready-made bed exists on UAT (no "Coming soon" badge). */
  ready: boolean;
  /** Empty for "My own words" (five empty seed tiles). */
  words: readonly UseCaseWord[];
}

export const USE_CASE_BEDS: readonly UseCaseBed[] = [
  {
    key: 'work',
    ready: false,
    words: [
      { word: 'deadline', stage: 'tree', meaning: { 'vi-VN': 'hạn chót', 'zh-CN': '截止日期' } },
      { word: 'negotiate', stage: 'flower', meaning: { 'vi-VN': 'đàm phán', 'zh-CN': '谈判' } },
      { word: 'schedule', stage: 'sprout', meaning: { 'vi-VN': 'lịch làm việc', 'zh-CN': '日程安排' } },
      { word: 'colleague', stage: 'flower', meaning: { 'vi-VN': 'đồng nghiệp', 'zh-CN': '同事' } },
      { word: 'feedback', stage: 'seed', meaning: { 'vi-VN': 'góp ý', 'zh-CN': '反馈' } },
    ],
  },
  {
    key: 'study',
    ready: true,
    words: [
      { word: 'mitigate', stage: 'flower', meaning: { 'vi-VN': 'giảm nhẹ', 'zh-CN': '减轻' } },
      { word: 'sustainable', stage: 'tree', meaning: { 'vi-VN': 'bền vững', 'zh-CN': '可持续的' } },
      { word: 'significant', stage: 'sprout', meaning: { 'vi-VN': 'đáng kể', 'zh-CN': '重要的' } },
      { word: 'analyse', stage: 'flower', meaning: { 'vi-VN': 'phân tích', 'zh-CN': '分析' } },
      { word: 'evidence', stage: 'seed', meaning: { 'vi-VN': 'bằng chứng', 'zh-CN': '证据' } },
    ],
  },
  {
    key: 'travel',
    ready: false,
    words: [
      { word: 'souvenir', stage: 'flower', meaning: { 'vi-VN': 'quà lưu niệm', 'zh-CN': '纪念品' } },
      { word: 'itinerary', stage: 'sprout', meaning: { 'vi-VN': 'lịch trình', 'zh-CN': '行程' } },
      { word: 'delay', stage: 'tree', meaning: { 'vi-VN': 'sự chậm trễ', 'zh-CN': '延误' } },
      { word: 'reservation', stage: 'flower', meaning: { 'vi-VN': 'đặt chỗ', 'zh-CN': '预订' } },
      { word: 'landmark', stage: 'seed', meaning: { 'vi-VN': 'địa danh', 'zh-CN': '地标' } },
    ],
  },
  {
    key: 'daily',
    ready: false,
    words: [
      { word: 'grocery', stage: 'tree', meaning: { 'vi-VN': 'tạp hóa', 'zh-CN': '杂货' } },
      { word: 'appointment', stage: 'flower', meaning: { 'vi-VN': 'cuộc hẹn', 'zh-CN': '预约' } },
      { word: 'neighbour', stage: 'sprout', meaning: { 'vi-VN': 'hàng xóm', 'zh-CN': '邻居' } },
      { word: 'refund', stage: 'flower', meaning: { 'vi-VN': 'hoàn tiền', 'zh-CN': '退款' } },
      { word: 'borrow', stage: 'seed', meaning: { 'vi-VN': 'mượn', 'zh-CN': '借' } },
    ],
  },
  { key: 'own', ready: true, words: [] },
];

export function findUseCaseBed(key: UseCaseBedKey): UseCaseBed {
  return USE_CASE_BEDS.find((bed) => bed.key === key) ?? USE_CASE_BEDS[0];
}
