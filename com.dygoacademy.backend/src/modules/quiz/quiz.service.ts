import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { GeminiEnrichmentService } from '../../ai/gemini-enrichment.service';
import { nuanceLanguage, stripMarkdown } from '../../ai/nuance-text';
import { DatabaseService } from '../../database/database.service';
import { SrsService } from '../srs/srs.service';
import { GenerateQuizDto } from './dto/generate-quiz.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import {
  MIN_DISTRACTORS,
  QUIZ_TYPES,
  QuizHint,
  QuizItem,
  QuizSourceWord,
  QuizType,
  buildQuizItem,
  deriveCorrectAnswer,
  deriveHint,
  gradeAnswer,
  parseQuizItemId,
  promptFor,
} from './quiz-generator';

interface QuizWordRow {
  topic_word_id: string;
  topic_id: string;
  source_word: string;
  audio_url: string | null;
  ipa_us: string | null;
  definition_en: string | null;
  synonyms: Array<{ word: string; level: string }> | null;
  antonyms: Array<{ word: string; level: string }> | null;
  example_sentences: Array<{ sentence: string; level: string; translation_hint: string }> | null;
}

export interface AnswerResult {
  quizItemId: string;
  correct: boolean;
  correctAnswer: string;
  /**
   * The word this quiz item was actually testing, plus its US IPA --
   * live-requested 2026-09-18 ("We should push word and API [IPA] to that
   * correct to know what is it be done"): a correct CLOZE/DICTATION/etc.
   * answer only ever echoed the literal answer string back (`correctAnswer`,
   * which for some quiz types is just the word anyway, but for others isn't
   * necessarily formatted the way a learner would want to see it presented
   * as "the word"), with no pronunciation shown at all on a correct
   * answer -- only a wrong one got that context, via nuanceExplanation.
   * `word`/`ipaUs` come straight from the same `WORD_COLUMNS` row this
   * method already queries below to grade the answer, so this is free --
   * no extra query. `ipaUs` (not `ipaUk` too) mirrors `QuizHint`'s own
   * existing choice just below.
   */
  word: string;
  ipaUs: string | null;
  /**
   * The word's first example sentence, unmasked (CLOZE/CONTEXTUAL_CHOICE
   * show this same sentence as the *prompt*, word blanked out -- this is
   * the reveal; DICTATION/MATCHING never showed it at all) -- live-
   * requested 2026-09-18 ("Any information we can give to the student in
   * correct result screen"). Same free-row reasoning as `word`/`ipaUs`
   * above: `word.exampleSentences` is already sitting in the `WORD_COLUMNS`
   * row this method queries to grade the answer, just not surfaced past
   * that point before now. Always populated here (cheap — it's already in
   * memory); QuizFeedback only renders it on the correct path, same as
   * `word`/`ipaUs`.
   */
  exampleSentence?: string;
  /** FR-5.5 — only populated on a wrong answer; see GeminiEnrichmentService.explainNuance. */
  nuanceExplanation?: string;
  /**
   * Echoes `SubmitAnswerDto.hintUsed` back. Since Phase 10 it also affects
   * scheduling: a hint caps a correct answer's SRS grade at HARD
   * (`srs/grading.ts`).
   */
  hintUsed: boolean;
  /**
   * Phase 10, Workstream 3 — what this answer did to the word's SRS
   * schedule. Absent only if recording it failed (logged, never fatal: a
   * broken SRS write must not turn a working quiz into a 500, the same rule
   * the Gemini nuance call follows). `graded: false` means the answer was
   * logged but didn't move the schedule (a correct answer on a word that
   * wasn't due yet, or a repeat mistake the same day).
   */
  srs?: {
    graded: boolean;
    justMastered: boolean;
    nextDueAt: string;
  };
}

const WORD_COLUMNS = `
  tw.id as topic_word_id,
  tw.topic_id,
  tw.source_word,
  ml.audio_url,
  ml.ipa_us,
  ml.definition_en,
  ml.synonyms,
  ml.antonyms,
  ml.example_sentences
`;

function mapRow(row: QuizWordRow): QuizSourceWord {
  return {
    topicWordId: row.topic_word_id,
    topicId: row.topic_id,
    sourceWord: row.source_word,
    audioUrl: row.audio_url,
    ipaUs: row.ipa_us,
    definition: row.definition_en,
    synonyms: row.synonyms ?? [],
    antonyms: row.antonyms ?? [],
    exampleSentences: row.example_sentences ?? [],
  };
}

/**
 * Module 5 — Dynamic Multi-Modal Quiz Engine (Phase 3). See
 * `quiz-generator.ts` for the generation/grading math (pure, unit tested in
 * isolation) — this class owns the DB reads and the one AI call FR-5.5
 * needs, same split as `SrsService`/`fsrs-scheduler.ts`.
 */
@Injectable()
export class QuizService {
  private readonly logger = new Logger(QuizService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly srs: SrsService,
    private readonly gemini: GeminiEnrichmentService,
  ) {}

  /**
   * FR-5.1–5.4. Oversamples candidate words (up to 4x `limit`, capped at
   * 100) because not every word has the data every requested type needs —
   * `buildQuizItem` returning `null` for, say, a word with no example
   * sentence is expected, not an error, so the fetch asks for more raw
   * material than the final answer needs rather than round-tripping again.
   */
  async generate(userId: string, dto: GenerateQuizDto): Promise<QuizItem[]> {
    const types: QuizType[] = dto.types?.length ? dto.types : [...QUIZ_TYPES];
    const limit = dto.limit ?? 10;
    const candidateLimit = Math.min(100, limit * 4);

    // Phase 9, "Targeted Re-Quiz" -- a third scope alongside `topicId`
    // (whole topic) and "neither" (every readable READY word): an exact
    // set of topic_word ids, e.g. the words just missed in a session.
    // `QuizController.generate` already rejects `topicId` + `topicWordIds`
    // supplied together, so at most one of these is ever set here.
    const scopeClause = dto.topicWordIds?.length
      ? 'and tw.id = any($1::uuid[])'
      : dto.topicId
        ? 'and tw.topic_id = $1'
        : '';
    const scopeParam: string | string[] | undefined = dto.topicWordIds?.length
      ? dto.topicWordIds
      : dto.topicId;
    const params = scopeParam !== undefined ? [scopeParam, candidateLimit] : [candidateLimit];

    const rows = await this.db.queryAs<QuizWordRow>(
      userId,
      `select ${WORD_COLUMNS}
         from public.topic_words tw
         join public.master_lexicon ml on ml.id = tw.lexicon_id
        where tw.status = 'READY'
          ${scopeClause}
        order by random()
        limit ${scopeParam !== undefined ? '$2' : '$1'}`,
      params,
    );
    if (rows.length === 0) return [];

    const words = rows.map(mapRow);
    const pool = await this.buildDistractorPool(
      userId,
      words.map((w) => w.sourceWord),
    );

    const items: QuizItem[] = [];
    for (const word of words) {
      if (items.length >= limit) break;
      for (const type of types) {
        if (items.length >= limit) break;
        const item = buildQuizItem(word, type, pool);
        if (item) items.push(item);
      }
    }
    return items;
  }

  /**
   * FR-5.5. Re-derives the exact question from `id` (see
   * `quiz-generator.ts`'s module doc — no session row backs a quiz item) and
   * grades it. Only calls Gemini when the answer was wrong, and only ever
   * degrades to a generic message on failure — a broken AI explanation call
   * must never turn a working quiz into a 500.
   */
  async answer(userId: string, itemId: string, dto: SubmitAnswerDto): Promise<AnswerResult> {
    let parsed: { topicWordId: string; type: QuizType };
    try {
      parsed = parseQuizItemId(itemId);
    } catch {
      throw new NotFoundException('Unknown quiz item.');
    }

    const rows = await this.db.queryAs<QuizWordRow>(
      userId,
      `select ${WORD_COLUMNS}
         from public.topic_words tw
         join public.master_lexicon ml on ml.id = tw.lexicon_id
        where tw.id = $1 and tw.status = 'READY'`,
      [parsed.topicWordId],
    );
    if (rows.length === 0) {
      throw new NotFoundException('Quiz word not found.');
    }
    const word = mapRow(rows[0]);
    const derived = deriveCorrectAnswer(word, parsed.type);
    if (!derived) {
      throw new NotFoundException(
        'This quiz item is no longer answerable — its source data changed.',
      );
    }

    const correct = gradeAnswer(derived.answer, dto.answer);
    const result: AnswerResult = {
      quizItemId: itemId,
      correct,
      correctAnswer: derived.answer,
      word: word.sourceWord,
      ipaUs: word.ipaUs,
      exampleSentence: word.exampleSentences[0]?.sentence,
      hintUsed: dto.hintUsed ?? false,
    };

    try {
      const srs = await this.srs.recordQuizResult(userId, {
        topicWordId: parsed.topicWordId,
        quizType: parsed.type,
        correct,
        hintUsed: dto.hintUsed ?? false,
        responseMs: dto.responseMs,
        quizFinished: dto.final === true,
      });
      result.srs = {
        graded: srs.graded,
        justMastered: srs.just_mastered,
        nextDueAt: new Date(srs.next_due_at).toISOString(),
      };
    } catch (err) {
      this.logger.warn(
        `Phase 10 quiz→SRS recording failed for "${word.sourceWord}" (${parsed.type}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    if (!correct) {
      try {
        const explanation = await this.gemini.explainNuance(
          word.sourceWord,
          derived.answer,
          dto.answer,
          promptFor(word, parsed.type, derived),
          nuanceLanguage(dto.locale),
        );
        // Gemini sometimes answers in Markdown despite the prompt; both quiz
        // screens show this as plain text.
        result.nuanceExplanation = stripMarkdown(explanation);
      } catch (err) {
        this.logger.warn(
          `FR-5.5 nuance explanation failed for "${word.sourceWord}" (${parsed.type}): ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        result.nuanceExplanation = `Not quite — the correct answer was "${derived.answer}".`;
      }
    }

    return result;
  }

  /**
   * On-demand hint for a TEXT-mode item (FR-5.x follow-up — see
   * `deriveHint`'s doc comment in quiz-generator.ts for why this is a
   * separate pull rather than data already sitting in the generated
   * `QuizItem`). Same id-parsing and 404 behavior as `answer()` above,
   * since both start from "does this quiz item id still resolve to a real,
   * READY word."
   */
  async hint(userId: string, itemId: string): Promise<QuizHint> {
    let parsed: { topicWordId: string; type: QuizType };
    try {
      parsed = parseQuizItemId(itemId);
    } catch {
      throw new NotFoundException('Unknown quiz item.');
    }

    const rows = await this.db.queryAs<QuizWordRow>(
      userId,
      `select ${WORD_COLUMNS}
         from public.topic_words tw
         join public.master_lexicon ml on ml.id = tw.lexicon_id
        where tw.id = $1 and tw.status = 'READY'`,
      [parsed.topicWordId],
    );
    if (rows.length === 0) {
      throw new NotFoundException('Quiz word not found.');
    }

    return deriveHint(mapRow(rows[0]));
  }

  /**
   * FR-3.3's "intensive remedial drill", built on `SrsService.findLeeches`
   * rather than a second leech query — one definition of "leech" for the
   * whole codebase. Tries the richest type first per word (a full sentence
   * forces real recall, closest to what FR-3.3 implies by "intensive"),
   * falling back through whatever the word's own enrichment data supports.
   */
  async leechDrill(userId: string, limit = 20): Promise<QuizItem[]> {
    const leeches = await this.srs.findLeeches(userId);
    if (leeches.length === 0) return [];

    const ids = leeches.slice(0, limit).map((l) => l.topic_word_id);
    const rows = await this.db.queryAs<QuizWordRow>(
      userId,
      `select ${WORD_COLUMNS}
         from public.topic_words tw
         join public.master_lexicon ml on ml.id = tw.lexicon_id
        where tw.id = any($1::uuid[])`,
      [ids],
    );
    const words = rows.map(mapRow);
    const pool = await this.buildDistractorPool(
      userId,
      words.map((w) => w.sourceWord),
    );

    const preferenceOrder: QuizType[] = ['CONTEXTUAL_CHOICE', 'CLOZE', 'MATCHING', 'DICTATION'];
    const items: QuizItem[] = [];
    for (const word of words) {
      for (const type of preferenceOrder) {
        const item = buildQuizItem(word, type, pool);
        if (item) {
          items.push(item);
          break;
        }
      }
    }
    return items;
  }

  /**
   * A small topic (or a leech batch of one or two words) may not itself
   * supply >= MIN_DISTRACTORS other words, so this falls back to a random
   * `master_lexicon` sample — global, not tenant-scoped, exactly like the
   * dedup cache it already backs (FR-2.2). Distractors are cosmetic (see
   * quiz-generator.ts's module doc), so borrowing unrelated words from the
   * global lexicon when a topic is too small is a fine trade.
   */
  private async buildDistractorPool(userId: string, candidateWords: string[]): Promise<string[]> {
    const pool = new Set(candidateWords);
    if (pool.size <= MIN_DISTRACTORS) {
      const extra = await this.db.queryAs<{ source_word: string }>(
        userId,
        `select normalized_word as source_word from public.master_lexicon order by random() limit 30`,
      );
      extra.forEach((r) => pool.add(r.source_word));
    }
    return [...pool];
  }
}
