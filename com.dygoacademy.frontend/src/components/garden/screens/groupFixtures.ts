/**
 * Canvas sample data for the group reference pages (UI-G, GR1–GR7),
 * copied from docs/design/garden/source/AdultGroup*.dc.html (English) and
 * AdultGroup*Vi.dc.html (Vietnamese). Sample content (garden names,
 * people, words, counts), not UI copy: the copy comes from the message
 * files. Chinese has no canvas page; its names are a draft like the rest
 * of zh-CN.json.
 */
import type { AppLocale } from '@/i18n/config';
import type { GroupRole } from '@/types';

import { calendarDay, type ClockTime } from '../format';
import type { GardenerTone } from '../GardenerAvatar';
import type { GroupTilePlant } from '../groupArt';

export const GROUP_REFERENCE_NAMES = [
  'GR1-shared-gardens',
  'GR2-group-garden',
  'GR3-tricky-patches',
  'GR4-gardeners',
  'GR5-invite',
  'GR6-join',
  'GR7-create',
] as const;
export type GroupReferenceName = (typeof GROUP_REFERENCE_NAMES)[number];

const NAMES_EN = {
  sprint: 'IELTS Sprint · Week 3',
  sprintShort: 'IELTS Sprint',
  writing: 'Saturday Writing Club',
  courts: 'Courts English Circle',
  beds: ['Environment', 'Education', 'Technology'],
  about: 'A shared garden for Band 7 vocabulary',
  newGarden: 'Band 7 Night Class',
} as const;

const NAMES = {
  'en-US': NAMES_EN,
  'vi-VN': {
    sprint: 'IELTS Sprint · Tuần 3',
    sprintShort: 'IELTS Sprint',
    writing: 'CLB Viết Thứ Bảy',
    courts: 'Nhóm Anh ngữ Quận 1',
    beds: ['Môi trường', 'Giáo dục', 'Công nghệ'],
    about: 'Vườn chung luyện từ vựng Band 7',
    newGarden: 'Lớp tối Band 7',
  },
  'zh-CN': {
    sprint: 'IELTS 冲刺 · 第 3 周',
    sprintShort: 'IELTS 冲刺',
    writing: '周六写作俱乐部',
    courts: 'Courts 英语圈',
    beds: ['环境', '教育', '科技'],
    about: '一起积累雅思 7 分词汇的共享花园',
    newGarden: '雅思 7 分夜班',
  },
} as const;

type Avatar = { text: string; tone: GardenerTone };
const M: Avatar = { text: 'M', tone: 'forest' };
const L: Avatar = { text: 'L', tone: 'flower' };
const T: Avatar = { text: 'T', tone: 'due' };
const H: Avatar = { text: 'H', tone: 'sprout' };
const A: Avatar = { text: 'A', tone: 'gold' };
const P: Avatar = { text: 'P', tone: 'mist' };

export interface FixtureGarden {
  id: string;
  name: string;
  role: GroupRole;
  members: number;
  beds: number;
  words: number;
  plant: GroupTilePlant;
  avatars: Avatar[];
  due: number;
}

export function groupFixtures(locale: AppLocale) {
  const n = NAMES[locale];
  const gardens: FixtureGarden[] = [
    { id: 'g1', name: n.sprint, role: 'ADMIN', members: 5, beds: 3, words: 126, plant: 'tree', avatars: [M, L, T, H], due: 5 },
    { id: 'g2', name: n.writing, role: 'READ', members: 12, beds: 4, words: 180, plant: 'flower', avatars: [A, P, L, T], due: 2 },
    { id: 'g3', name: n.courts, role: 'WRITE', members: 8, beds: 2, words: 64, plant: 'sprout', avatars: [H, M, A], due: 0 },
  ];
  return {
    list: {
      gardens,
      gardeners: 25,
      rainDay: {
        group: n.sprintShort,
        words: 10,
        done: 3,
        members: 5,
        ends: { hour: 23, minute: 59 } satisfies ClockTime,
      },
    },
    garden: {
      name: n.sprint,
      role: 'ADMIN' as GroupRole,
      members: 5,
      hero: { words: 126, watered: 4, ripe: 412, plants: 630 },
      rainDay: { words: 10, done: 3, mine: 4 },
      beds: [
        { id: 'b1', title: n.beds[0], words: 48, level: 'B2–C1', plant: 'tree' as const, due: 5, shares: { tree: 38, flower: 15, sprout: 23 } },
        { id: 'b2', title: n.beds[1], words: 40, level: 'B2', plant: 'flower' as const, due: 0, shares: { tree: 55, flower: 22, sprout: 13 } },
        { id: 'b3', title: n.beds[2], words: 38, level: 'B2–C1', plant: 'sprout' as const, due: 0, shares: { tree: 18, flower: 16, sprout: 42 } },
      ],
      avatars: [M, L, T, H, { text: '+1', tone: 'more' as const }],
    },
    tricky: {
      rows: [
        { word: 'deteriorate', misses: 14, gardeners: 4 },
        { word: 'mitigate', misses: 11, gardeners: 3 },
        { word: 'drought', misses: 9, gardeners: 4 },
        { word: 'sustainable', misses: 6, gardeners: 2 },
        { word: 'biodiversity', misses: 5, gardeners: 3 },
      ],
      members: 5,
      size: 10 as const,
      /** Tuesday of the canvas week (the canvas's today is Friday 25 September 2026). */
      lastDay: calendarDay(2026, 9, 22),
      lastJoined: 4,
    },
    roster: [
      { id: 'u1', name: 'Minh', avatar: M, isYou: true, joined: calendarDay(2026, 9, 2), role: 'ADMIN' as GroupRole },
      { id: 'u2', name: 'Linh Tran', avatar: L, isYou: false, joined: calendarDay(2026, 9, 4), role: 'WRITE' as GroupRole },
      { id: 'u3', name: 'Tom Walker', avatar: T, isYou: false, joined: calendarDay(2026, 9, 4), role: 'READ' as GroupRole },
      { id: 'u4', name: 'Hui Min', avatar: H, isYou: false, joined: calendarDay(2026, 9, 9), role: 'READ' as GroupRole },
      { id: 'u5', name: 'Arjun', avatar: A, isYou: false, joined: calendarDay(2026, 9, 21), role: 'READ' as GroupRole },
    ],
    invites: { count: 2, role: 'READ' as GroupRole, used: 3, max: 20, expires: calendarDay(2026, 10, 3) },
    invite: { role: 'READ' as GroupRole, days: 7, uses: 20, link: 'dygoacademy.com/join/7Hk2-qP9x-Lm4r' },
    join: {
      name: n.sprint,
      description: n.about,
      inviter: { name: 'Minh', initial: 'M', tone: 'forest' as const },
      counts: { gardeners: 5, beds: 3, words: 126 },
      role: 'READ' as GroupRole,
    },
    create: { name: n.newGarden },
  };
}
