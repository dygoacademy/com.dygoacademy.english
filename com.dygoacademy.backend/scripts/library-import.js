#!/usr/bin/env node
/**
 * library-import — load the public library (collections and their beds)
 * from a CSV.
 *
 *   npm run library-import -- path/to/library.csv                 # uses ../.env
 *   npm run library-import:prod -- path/to/library.csv            # uses ../env-profiles/prod.env
 *   npm run library-import -- library.csv --dry-run               # check the file, write nothing
 *   npm run library-import -- library.csv --replace               # remove the current library first
 *   npm run library-import -- library.csv --no-queue              # don't queue enrichment (a test copy)
 *
 * CSV columns (header row required): collection, shelf, bed_title,
 * bed_description, word, cefr
 *   collection       the public group, e.g. "IELTS Academic"
 *   shelf            groups.library_shelf: academic | general | work | travel,
 *                    or blank for none (shows under All only)
 *   bed_title        the topic; one row per word
 *   bed_description  the topic's description (the first row of a bed wins)
 *   word             the word or phrase
 *   cefr             its level, passed to enrichment as the target (A2–C1)
 *
 * Collections are found by name among the library owner's groups (made
 * public, with the shelf) or created; beds by title within the collection
 * or created; words a bed already has are left alone. A word already in
 * master_lexicon is added READY with that entry; any other word is added
 * ENRICHING and, after the commit, queued for the running backend's
 * EnrichmentProcessor at low priority, exactly as a word a learner adds.
 *
 * --replace, in the same transaction, first removes the current library:
 * every topic of every public group (except My words beds and the 4 tier
 * ladder topics, which srs.service.ts TIER_TOPICS needs by id and which are
 * moved into the collection the CSV names them in). A public group the
 * CSV doesn't name is deleted, unless it keeps other topics or has members
 * besides its owner: then it only stops being public. Never touches
 * master_lexicon, word_relations or private groups. Removing a topic also
 * removes learners' progress on its words (user_word_srs, review_logs,
 * user_beds). A learner whose first bed is removed gets a new one from their
 * goal, the way onboarding picks it (profiles.service.ts PICK_FIRST_BED).
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { Queue } = require('bullmq');

// Keep in sync with src/queues/queue.constants.ts and queues.module.ts.
const ENRICHMENT_QUEUE = 'enrichment-queue';
const ENRICH_WORD_JOB = 'enrich-word';
const LOW_PRIORITY = 10;
const TARGET_CEFR = new Set(['A2', 'B1', 'B2', 'C1']);
const SHELVES = new Set(['academic', 'general', 'work', 'travel']);

// Keep in sync with src/modules/srs/srs.service.ts TIER_TOPICS.
const TIER_TOPICS = {
  'Foundation Vocabulary': 'c9c9c9c9-0000-0000-0000-000000000001',
  'Core Vocabulary': 'c9c9c9c9-0000-0000-0000-000000000002',
  'Band 6.5 Ready': 'c9c9c9c9-0000-0000-0000-000000000003',
  'Band 7.5 Ready': 'c9c9c9c9-0000-0000-0000-000000000004',
};

// Keep in sync with src/modules/profiles/profiles.service.ts FIRST_BED_TITLES.
const FIRST_BED_TITLES = {
  IELTS: '\\m(foundation vocabulary|academic word list|describing data)',
  IELTS_GENERAL:
    '\\m(housing and neighbourhood|shopping and money|letters and emails|health and wellbeing|education and training|community and local services)',
  PTE: '\\m(foundation vocabulary|academic word list|describing data)',
  WORK: '\\m(job hunting|emails at work|customer service|meetings and discussions|projects and deadlines|leadership and teamwork)',
  TRAVEL:
    '\\m(at the airport|getting around town|hotels and bookings|food and restaurants|sightseeing and culture|problems on the road)',
  LIFE: '\\m(home and family|food and cooking|hobbies and free time|feelings and moods|friends and social life|news and opinions)',
};

// The seed admin who owns the library collections (database/seeds/01_core_fixtures.sql).
const DEFAULT_OWNER = '11111111-1111-1111-1111-111111111111';

function loadEnv() {
  const env = {};
  for (const candidate of ['../.env', '.env']) {
    const file = path.resolve(__dirname, '..', candidate);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match) env[match[1]] = match[2];
    }
  }
  for (const key of ['DATABASE_URL', 'REDIS_HOST', 'REDIS_PORT', 'REDIS_PASSWORD']) {
    if (process.env[key] !== undefined) env[key] = process.env[key];
  }
  return env;
}

/** Minimal CSV: commas, optional double quotes ("" inside quotes = a quote). */
function parseCsv(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cells = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else if (ch === '"') quoted = false;
        else cell += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ',') {
        cells.push(cell);
        cell = '';
      } else cell += ch;
    }
    cells.push(cell);
    rows.push(cells.map((c) => c.trim()));
  }
  return rows;
}

/** The CSV as collections → beds → words, in file order. */
function readLibrary(file) {
  const [header, ...body] = parseCsv(fs.readFileSync(file, 'utf8'));
  const col = (name) => header.map((h) => h.toLowerCase()).indexOf(name);
  const at = {
    collection: col('collection'),
    shelf: col('shelf'),
    title: col('bed_title'),
    description: col('bed_description'),
    word: col('word'),
    cefr: col('cefr'),
  };
  if (at.collection < 0 || at.title < 0 || at.word < 0) {
    throw new Error('The CSV needs a header row with at least: collection, bed_title, word');
  }
  const collections = new Map();
  const problems = [];
  body.forEach((cells, i) => {
    const line = i + 2;
    const name = cells[at.collection] || '';
    const shelf = (at.shelf >= 0 && cells[at.shelf]) || null;
    const title = cells[at.title] || '';
    const word = cells[at.word] || '';
    const cefr = (at.cefr >= 0 && (cells[at.cefr] || '').toUpperCase()) || null;
    if (!name || !title || !word)
      return problems.push(`line ${line}: collection, bed_title and word are required`);
    if (shelf && !SHELVES.has(shelf))
      return problems.push(`line ${line}: shelf must be academic, general, work, travel or blank`);
    if (!collections.has(name))
      collections.set(name, { name, shelf, beds: new Map(), words: new Set() });
    const c = collections.get(name);
    if (c.shelf !== shelf)
      return problems.push(`line ${line}: "${name}" already has shelf ${c.shelf || '(blank)'}`);
    const key = word.toLowerCase();
    if (c.words.has(key)) return problems.push(`line ${line}: "${word}" is already in ${name}`);
    c.words.add(key);
    if (!c.beds.has(title)) {
      c.beds.set(title, {
        title,
        description: (at.description >= 0 && cells[at.description]) || null,
        words: [],
      });
    }
    c.beds.get(title).words.push({ word, cefr });
  });
  return { collections: [...collections.values()], problems };
}

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  const dryRun = args.includes('--dry-run');
  const replace = args.includes('--replace');
  const queueWords = !args.includes('--no-queue');
  const ownerArg = args.indexOf('--owner');
  const owner = ownerArg >= 0 ? args[ownerArg + 1] : DEFAULT_OWNER;
  if (!file) {
    console.error(
      'usage: library-import <file.csv> [--replace] [--dry-run] [--no-queue] [--owner <user id>]',
    );
    process.exit(1);
  }
  const { collections, problems } = readLibrary(file);
  if (problems.length) {
    problems.forEach((p) => console.error(`error ${p}`));
    process.exit(1);
  }

  const env = loadEnv();
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set (../.env or the environment)');
  const db = new Client({ connectionString: env.DATABASE_URL });
  await db.connect();
  const q = async (text, params) => (await db.query(text, params)).rows;
  const report = {
    removed: [],
    unpublished: [],
    deletedGroups: [],
    beds: [],
    reused: 0,
    enriching: [],
    firstBeds: [],
  };
  try {
    // Library tables are written by service_role only (see audio-backfill.js
    // for why DATABASE_URL's own role needs this).
    await db.query('set role service_role');
    await db.query('begin');

    const [ownerRow] = await q('select id, tenant_id from public.profiles where id = $1', [owner]);
    if (!ownerRow)
      throw new Error(`library owner ${owner} has no profile (pass --owner <user id>)`);
    const names = collections.map((c) => c.name);
    const tierIds = Object.values(TIER_TOPICS);

    // Learners whose first bed is removed: picked again at the end.
    let affected = [];
    if (replace) {
      const doomed = `
        select t.id from public.topics t join public.groups g on g.id = t.group_id
         where g.is_public and not t.is_my_words and t.id <> all($1::uuid[])`;
      affected = (
        await q(
          `select p.id, p.study_goal from public.profiles p where p.first_topic_id in (${doomed})`,
          [tierIds],
        )
      ).map((r) => ({ id: r.id, goal: r.study_goal }));
      report.removed = await q(
        `delete from public.topics t using public.groups g
          where g.id = t.group_id and g.is_public and not t.is_my_words and t.id <> all($1::uuid[])
        returning g.name as collection, t.title`,
        [tierIds],
      );
      const stale = await q(
        `select g.id, g.name,
                exists (select 1 from public.topics t where t.group_id = g.id) as has_topics,
                exists (select 1 from public.group_members m
                         where m.group_id = g.id and m.user_id <> g.owner_id) as has_members
           from public.groups g
          where g.is_public and not (g.owner_id = $1 and g.name = any($2::text[]))`,
        [owner, names],
      );
      for (const g of stale) {
        if (g.has_topics || g.has_members) {
          await q(
            'update public.groups set is_public = false, library_shelf = null where id = $1',
            [g.id],
          );
          report.unpublished.push(g.name);
        } else {
          await q('delete from public.groups where id = $1', [g.id]);
          report.deletedGroups.push(g.name);
        }
      }
    }

    for (const c of collections) {
      let [group] = await q(
        `select id from public.groups
          where owner_id = $1 and name = $2 and not is_personal
          order by is_public desc, created_at limit 1`,
        [owner, c.name],
      );
      if (group) {
        await q('update public.groups set is_public = true, library_shelf = $2 where id = $1', [
          group.id,
          c.shelf,
        ]);
      } else {
        [group] = await q(
          `insert into public.groups (tenant_id, owner_id, name, is_public, library_shelf)
           values ($1, $2, $3, true, $4) returning id`,
          [ownerRow.tenant_id, owner, c.name, c.shelf],
        );
      }

      for (const bed of c.beds.values()) {
        let [topic] = await q(
          'select id from public.topics where group_id = $1 and title = $2 and not is_my_words',
          [group.id, bed.title],
        );
        if (!topic && TIER_TOPICS[bed.title]) {
          [topic] = await q('select id from public.topics where id = $1', [TIER_TOPICS[bed.title]]);
        }
        if (topic) {
          await q(
            `update public.topics
                set group_id = $2, title = $3, description = coalesce($4, description), is_public = true
              where id = $1`,
            [topic.id, group.id, bed.title, bed.description],
          );
        } else {
          // clock_timestamp: beds keep the file's order (now() is the same all transaction).
          [topic] = await q(
            `insert into public.topics (group_id, title, description, is_public, created_at)
             values ($1, $2, $3, true, clock_timestamp()) returning id`,
            [group.id, bed.title, bed.description],
          );
        }

        let added = 0;
        for (const w of bed.words) {
          const [had] = await q(
            'select 1 from public.topic_words where topic_id = $1 and lower(source_word) = lower($2)',
            [topic.id, w.word],
          );
          if (had) continue;
          const [lexicon] = await q(
            `select id from public.master_lexicon where normalized_word = lower($1) and language_code = 'en'`,
            [w.word],
          );
          const [row] = await q(
            `insert into public.topic_words
               (topic_id, lexicon_id, source_word, language_code, status, added_by, created_at)
             values ($1, $2, $3, 'en', $4::word_status, $5, clock_timestamp())
             returning id`,
            [topic.id, lexicon ? lexicon.id : null, w.word, lexicon ? 'READY' : 'ENRICHING', owner],
          );
          added++;
          if (lexicon) report.reused++;
          else report.enriching.push({ id: row.id, word: w.word, cefr: w.cefr });
        }
        const [{ n }] = await q(
          'select count(*)::int as n from public.topic_words where topic_id = $1',
          [topic.id],
        );
        report.beds.push({ collection: c.name, title: bed.title, words: n, added });
      }
    }

    // A new first bed for learners who lost theirs, as onboarding picks it.
    for (const learner of affected) {
      const [picked] = await q(
        `update public.profiles p
            set first_topic_id = (
                  select t.id
                    from public.topics t
                    join public.topic_words tw on tw.topic_id = t.id
                   where t.is_public
                   group by t.id
                   order by coalesce(t.title ~* $2, false) desc, count(tw.id) desc, t.created_at
                   limit 1),
                updated_at = now()
          where p.id = $1 and p.first_topic_id is null
          returning (select title from public.topics where id = p.first_topic_id) as title`,
        [learner.id, FIRST_BED_TITLES[learner.goal] ?? null],
      );
      if (picked) report.firstBeds.push({ ...learner, title: picked.title });
    }

    await db.query(dryRun ? 'rollback' : 'commit');
  } catch (err) {
    await db.query('rollback').catch(() => undefined);
    throw err;
  } finally {
    await db.end();
  }

  const tag = dryRun ? '[dry run] would have ' : '';
  if (replace) {
    console.log(`${tag}removed ${report.removed.length} topics:`);
    report.removed.forEach((t) => console.log(`  ${t.collection} / ${t.title}`));
    if (report.deletedGroups.length)
      console.log(`${tag}deleted groups: ${report.deletedGroups.join(', ')}`);
    if (report.unpublished.length)
      console.log(`${tag}made private (kept for members): ${report.unpublished.join(', ')}`);
  }
  console.log(`${tag}loaded ${report.beds.length} beds:`);
  report.beds.forEach((b) =>
    console.log(`  ${b.collection} / ${b.title}: ${b.words} words (${b.added} added)`),
  );
  console.log(
    `${tag}added ${report.reused} words already in the lexicon, ${report.enriching.length} new words to enrich`,
  );
  report.firstBeds.forEach((l) =>
    console.log(`${tag}new first bed for ${l.id} (${l.goal || 'no goal'}): ${l.title}`),
  );
  if (dryRun || report.enriching.length === 0) return;
  if (!queueWords) {
    console.log('--no-queue: the new words stay ENRICHING until queued.');
    return;
  }

  const queue = new Queue(ENRICHMENT_QUEUE, {
    connection: {
      host: env.REDIS_HOST || 'localhost',
      port: parseInt(env.REDIS_PORT || '6379', 10),
      password: env.REDIS_PASSWORD || undefined,
    },
  });
  try {
    await queue.addBulk(
      report.enriching.map((w) => ({
        name: ENRICH_WORD_JOB,
        data: {
          topicWordId: w.id,
          word: w.word,
          languageCode: 'en',
          ...(TARGET_CEFR.has(w.cefr) ? { targetCEFR: w.cefr } : {}),
          triggeredByUserId: owner,
        },
        opts: {
          priority: LOW_PRIORITY,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { age: 3600, count: 1000 },
          removeOnFail: { age: 86_400 },
        },
      })),
    );
  } finally {
    await queue.close();
  }
  console.log(`queued ${report.enriching.length} words for enrichment`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
