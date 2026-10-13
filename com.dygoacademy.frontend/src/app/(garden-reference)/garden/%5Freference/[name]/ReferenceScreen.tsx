'use client';

import { useTranslations } from 'next-intl';

import { AUTH_HREFS } from '@/components/garden/auth/authPaths';
import { AccountSheet } from '@/components/garden/AccountSheet';
import { ForgotPasswordScreen } from '@/components/garden/auth/ForgotPasswordScreen';
import { RegisterScreen } from '@/components/garden/auth/RegisterScreen';
import { SignInScreen } from '@/components/garden/auth/SignInScreen';
import { GroupsTabProvider } from '@/components/garden/groupsTab';
import { GardenLoader } from '@/components/garden/loader/GardenLoader';
import {
  ACCOUNT,
  ENTRY,
  FORGOT_PASSWORD,
  HOME_REFERENCE,
  ONBOARDING,
  QUIZ,
  QUIZ_RESULT,
  PRIVACY,
  REGISTER,
  SIGN_IN,
  TOPIC_SEARCH,
  WORD_SEARCH,
  entryBees,
  topicSearchMore,
  referenceFixtures,
  type ReferenceName,
} from '@/components/garden/screens/fixtures';
import { AllWateredScreen } from '@/components/garden/screens/AllWateredScreen';
import { MeScreen } from '@/components/garden/screens/MeScreen';
import { OnboardLevelScreen } from '@/components/garden/screens/OnboardLevelScreen';
import { OnboardReadyScreen } from '@/components/garden/screens/OnboardReadyScreen';
import { OnboardReminderScreen } from '@/components/garden/screens/OnboardReminderScreen';
import { PrivacyScreen } from '@/components/garden/screens/PrivacyScreen';
import { VOICE_DONATION_LINKS } from '@/lib/voice-donation';
import { MissionCompleteScreen } from '@/components/garden/screens/MissionCompleteScreen';
import { QuizResultScreen } from '@/components/garden/screens/QuizResultScreen';
import { QuizScreen } from '@/components/garden/screens/QuizScreen';
import { ReviewScreen } from '@/components/garden/screens/ReviewScreen';
import { TodaysGardenScreen } from '@/components/garden/screens/TodaysGardenScreen';
import { TopicBedScreen } from '@/components/garden/screens/TopicBedScreen';
import { TopicsScreen } from '@/components/garden/screens/TopicsScreen';
import { TopicSearchScreen } from '@/components/garden/screens/TopicSearchScreen';
import { TopicWordSearchScreen } from '@/components/garden/screens/TopicWordSearchScreen';
import { searchBedWords } from '@/components/garden/live/data';
import { WeeklyHarvestScreen } from '@/components/garden/screens/WeeklyHarvestScreen';
import { WelcomeBackScreen } from '@/components/garden/screens/WelcomeBackScreen';
import { HomeScreen } from '@/components/home/HomeScreen';
import type { PainKey } from '@/components/home/PainCards';
import type { UseCaseBedKey } from '@/components/home/useCaseWords';
import { GARDEN_ROUTES } from '@/constants/garden';
import type { AppLocale } from '@/i18n/config';

import { GroupReferenceScreen } from './GroupReferenceScreen';
import { PronounceReferenceScreen } from './PronounceReferenceScreen';
import { SpeakReferenceScreen } from './SpeakReferenceScreen';

/**
 * The screen for one reference page. A client component so every garden
 * screen below reads the provider's messages and formats (the page's
 * `?locale=`), not the request's language, with that language's canvas
 * sample data (`referenceFixtures`).
 *
 * NAV-1 (canvas 1790485425-11d4): the A-screens with a tab bar show the
 * sample learner in a group, so five tabs like the GR-screens.
 */
export function ReferenceScreen({ name, locale }: { name: ReferenceName; locale: AppLocale }) {
  const screen = <ReferenceScreenBody name={name} locale={locale} />;
  return name.startsWith('GR') ? screen : <GroupsTabProvider value>{screen}</GroupsTabProvider>;
}

function ReferenceScreenBody({ name, locale }: { name: ReferenceName; locale: AppLocale }) {
  const {
    ALL_WATERED,
    BED,
    COMEBACK,
    COMEBACK_START,
    COMPLETE,
    HARVEST,
    HOME,
    ME,
    QUIZ_TOPIC,
    REVIEW,
    TOPICS,
    TOPICS_ACADEMIC_FILTER,
    TOPICS_LOCKED_PACK,
  } = referenceFixtures(locale);
  const review = useTranslations('screens.review');
  const topics = useTranslations('screens.topics');
  const privacyText = useTranslations('screens.privacy');
  const home = GARDEN_ROUTES.home;

  switch (name) {
    // The A1 canvas has the speaking mission as the 3rd (merged from SE1).
    case 'A1-todays-garden':
    case 'SE1-entry-home':
      return (
        <TodaysGardenScreen
          {...HOME}
          missions={[
            ...HOME.missions.slice(0, 2),
            { ...ENTRY.homeSpeak, href: GARDEN_ROUTES.reference('SE2-entry-bed') },
          ]}
          stickyNav={false}
        />
      );
    case 'A1b-all-watered': {
      const { bed, ...props } = ALL_WATERED;
      return (
        <AllWateredScreen
          {...props}
          extras={{
            plant: { bed, href: GARDEN_ROUTES.reference('A7-topic-bed') },
            speakHref: GARDEN_ROUTES.reference('SP2-speak-countdown'),
            quizHref: GARDEN_ROUTES.reference('Q1-quiz-choose'),
          }}
          stickyNav={false}
        />
      );
    }
    case 'A2-review-question':
    case 'A2-review-answer':
    case 'A2-review-finished': {
      const finished = name === 'A2-review-finished';
      return (
        <ReviewScreen
          state={name === 'A2-review-question' ? 'question' : finished ? 'finished' : 'answer'}
          missionTitle={review('title', { count: REVIEW.total })}
          done={finished ? REVIEW.total : REVIEW.done}
          total={REVIEW.total}
          closeHref={home}
          card={REVIEW.card}
          intervals={REVIEW.intervals}
          bloomHref={GARDEN_ROUTES.reviewDone}
          secondaryAction={{
            label: review('replayDemo'),
            href: GARDEN_ROUTES.reference('A2-review-question'),
          }}
        />
      );
    }
    case 'A3-mission-complete':
      return (
        <MissionCompleteScreen
          {...COMPLETE}
          closeHref={home}
          backHref={home}
          missions={{
            ...COMPLETE.missions,
            next: { ...COMPLETE.missions.next, href: GARDEN_ROUTES.review },
          }}
        />
      );
    case 'A4-weekly-harvest':
      return (
        <WeeklyHarvestScreen
          {...HARVEST}
          group={{ ...HARVEST.group, href: GARDEN_ROUTES.reference('GR2-group-garden') }}
          stickyNav={false}
        />
      );
    case 'A5-welcome-back':
      return (
        <WelcomeBackScreen
          {...COMEBACK}
          start={{
            ...COMEBACK.start,
            href: GARDEN_ROUTES.review,
            waterAll: { ...COMEBACK.start.waterAll, href: GARDEN_ROUTES.review },
          }}
          stickyNav={false}
        />
      );
    case 'A5b-welcome-back-start':
      return (
        <WelcomeBackScreen
          {...COMEBACK_START}
          start={{
            ...COMEBACK_START.start,
            href: GARDEN_ROUTES.reviewFirst(COMEBACK_START.start.count),
            waterAll: { ...COMEBACK_START.start.waterAll, href: GARDEN_ROUTES.review },
          }}
          stickyNav={false}
        />
      );
    case 'A6-topics':
      return (
        <TopicsScreen
          topics={TOPICS}
          filters={[
            TOPICS_ACADEMIC_FILTER,
            { id: 'mine', label: topics('mine') },
          ]}
          lockedPack={TOPICS_LOCKED_PACK}
          searchHref={GARDEN_ROUTES.reference('A6b-search-topics')}
          newBedHref={GARDEN_ROUTES.topics}
          stickyNav={false}
        />
      );
    case 'A7-topic-bed':
    case 'A7-topic-bed-filter-sprouts':
      return (
        <TopicBedScreen
          {...BED}
          initialStage={name === 'A7-topic-bed' ? null : 'sprout'}
          backHref={GARDEN_ROUTES.reference('A6-topics')}
          water={{ ...BED.water, href: GARDEN_ROUTES.review }}
          quizHref={GARDEN_ROUTES.review}
          addWordHref={GARDEN_ROUTES.topics}
          optionsHref={GARDEN_ROUTES.topics}
          searchHref={GARDEN_ROUTES.reference('A7c-word-search')}
          speak={{ ...ENTRY.bedSpeak, href: GARDEN_ROUTES.reference('SP2-speak-countdown') }}
          bees={entryBees(GARDEN_ROUTES.reference('SP2-speak-countdown'))}
        />
      );
    case 'A6b-search-topics': {
      const sample = TOPIC_SEARCH[locale];
      const yours = TOPICS.slice(0, 1).map((topic) => ({
        ...topic,
        collection: BED.meta.collection,
        planted: true,
        href: GARDEN_ROUTES.reference('A7-topic-bed'),
      }));
      return (
        <TopicSearchScreen
          query={sample.query}
          onQueryChange={() => {}}
          cancelHref={GARDEN_ROUTES.reference('A6-topics')}
          yours={yours}
          more={topicSearchMore(locale, GARDEN_ROUTES.reference('A7-topic-bed'))}
          plantHref={(topic) => topic.href}
          wordHint={{ ...sample.word, href: GARDEN_ROUTES.reference('A7c-word-search') }}
          recent={sample.recent}
          onRecent={() => {}}
        />
      );
    }
    case 'A7c-word-search': {
      const sample = WORD_SEARCH[locale];
      return (
        <TopicWordSearchScreen
          topic={BED.title}
          query={sample.query}
          onQueryChange={() => {}}
          cancelHref={GARDEN_ROUTES.reference('A7-topic-bed')}
          matches={searchBedWords(BED.words, sample.query)}
          hrefFor={() => GARDEN_ROUTES.reference('A7-topic-bed')}
          suggestion={sample.suggestion}
          onPlant={() => {}}
          recent={WORD_SEARCH.recent}
          onRecent={() => {}}
        />
      );
    }
    case 'SE2-entry-bed':
    case 'SE5-entry-harvest':
      return (
        <TopicBedScreen
          {...BED}
          backHref={GARDEN_ROUTES.reference('A6-topics')}
          water={{ ...BED.water, href: GARDEN_ROUTES.review }}
          quizHref={GARDEN_ROUTES.review}
          addWordHref={GARDEN_ROUTES.topics}
          optionsHref={GARDEN_ROUTES.topics}
          {...(name === 'SE2-entry-bed'
            ? { speak: { ...ENTRY.bedSpeak, href: GARDEN_ROUTES.reference('SE5-entry-harvest') } }
            : { bees: entryBees(GARDEN_ROUTES.reference('SE2-entry-bed')) })}
        />
      );
    case 'A8-me':
    case 'A8-me-account':
      return (
        <>
          <MeScreen
            {...ME}
            dailyGoal={{ ...ME.dailyGoal, href: GARDEN_ROUTES.missions }}
            family={{ ...ME.family, href: '/' }}
            privacy={{ donating: false, href: GARDEN_ROUTES.reference('A8e-privacy') }}
            stickyNav={false}
          />
          {name === 'A8-me-account' ? (
            <AccountSheet
              open
              onOpenChange={() => {}}
              name={ME.name}
              email={ACCOUNT.email}
              onSignOut={() => {}}
            />
          ) : null}
        </>
      );
    case 'A8e-privacy':
    case 'A8e-privacy-confirm':
    case 'A8e-privacy-on':
    case 'A8e-privacy-delete':
    case 'A8e-privacy-deleted': {
      const on = name === 'A8e-privacy-on' || name === 'A8e-privacy-delete';
      return (
        <PrivacyScreen
          framed
          backHref={GARDEN_ROUTES.reference('A8-me')}
          status={
            on
              ? { donating: true, count: PRIVACY.count, since: PRIVACY.since }
              : { donating: false, count: 0, since: null }
          }
          overlay={
            name === 'A8e-privacy-confirm'
              ? 'confirm'
              : name === 'A8e-privacy-delete'
                ? 'delete'
                : null
          }
          region={PRIVACY.region}
          onRegionChange={() => {}}
          onSwitch={() => {}}
          onConfirm={() => {}}
          onDismiss={() => {}}
          onAskDelete={() => {}}
          onDelete={() => {}}
          toast={name === 'A8e-privacy-deleted' ? privacyText('toast.deleted', { count: PRIVACY.count }) : null}
          links={VOICE_DONATION_LINKS}
        />
      );
    }
    case 'Q1-quiz-choose':
    case 'Q2-quiz-right':
    case 'Q3-quiz-not-quite':
    case 'Q4-quiz-cloze-hint':
    case 'Q5-quiz-listen':
      return (
        <QuizScreen
          {...QUIZ[name]}
          topicTitle={QUIZ_TOPIC}
          closeHref={GARDEN_ROUTES.reference('A7-topic-bed')}
          onHint={() => {}}
          onSubmit={() => {}}
          onNext={() => {}}
        />
      );
    case 'Q6-quiz-result':
    case 'Q7-quiz-result-perfect':
    case 'Q8-quiz-drill-done':
      return (
        <QuizResultScreen
          {...QUIZ_RESULT[name]}
          closeHref={GARDEN_ROUTES.reference('A7-topic-bed')}
          backHref={GARDEN_ROUTES.reference('A7-topic-bed')}
          back="bed"
          drillHref={GARDEN_ROUTES.reference('Q1-quiz-choose')}
        />
      );
    case 'P1-say-word':
    case 'P2-recording-beep':
    case 'P2-recording':
    case 'P3-checking':
    case 'P4-result-retry':
    case 'P4-result-pollinated':
    case 'P2b-not-heard':
    case 'P2b-not-heard-noisy':
    case 'P2b-not-heard-other-word':
    case 'iP1-say-word':
    case 'iP2-recording':
    case 'iP3-checking':
    case 'iP4-result-retry':
    case 'iP4-result-pollinated':
    case 'iP2b-not-heard':
      return <PronounceReferenceScreen name={name} locale={locale} />;
    case 'SP2-speak-countdown':
    case 'SP2-speak-recording':
    case 'SP3-speak-checking':
    case 'SP3-speak-done':
    case 'SP3-speak-failed':
      return <SpeakReferenceScreen name={name} />;
    case 'GR1-shared-gardens':
    case 'GR2-group-garden':
    case 'GR3-tricky-patches':
    case 'GR4-gardeners':
    case 'GR5-invite':
    case 'GR6-join':
    case 'GR7-create':
    case 'SE6-entry-echo':
      return <GroupReferenceScreen name={name} locale={locale} />;
    case 'AU1-sign-in':
    case 'AU1-sign-in-error':
      return (
        <SignInScreen
          locale={locale}
          onLanguageChange={() => {}}
          onSubmit={() => {}}
          error={name === 'AU1-sign-in-error' ? 'mismatch' : null}
          forgotHref={AUTH_HREFS.forgotPassword}
          registerHref={AUTH_HREFS.register}
          initialEmail={SIGN_IN.email}
          initialPassword={SIGN_IN.password}
        />
      );
    case 'OB1-about-you':
    case 'OB1-about-you-work':
      return (
        <OnboardLevelScreen
          level={ONBOARDING.level}
          goal={name === 'OB1-about-you-work' ? 'WORK' : ONBOARDING.goal}
          band={ONBOARDING.band}
          onLevelChange={() => {}}
          onGoalChange={() => {}}
          onBandStep={() => {}}
          onContinue={() => {}}
          back={AUTH_HREFS.register}
        />
      );
    case 'OB4-reminder':
      return (
        <OnboardReminderScreen
          choice="morning"
          onChoiceChange={() => {}}
          onConfirm={() => {}}
          onNotNow={() => {}}
          back={GARDEN_ROUTES.reference('OB1-about-you')}
        />
      );
    case 'OB5-ready':
      return (
        <OnboardReadyScreen
          name={ONBOARDING.name}
          bed={ONBOARDING.bed[locale]}
          level={ONBOARDING.level}
          goal={{ goal: ONBOARDING.goal, band: ONBOARDING.band }}
          reminder={ONBOARDING.reminder}
          links={{
            level: GARDEN_ROUTES.reference('OB1-about-you'),
            goal: GARDEN_ROUTES.reference('OB1-about-you'),
            reminder: GARDEN_ROUTES.reference('OB4-reminder'),
          }}
          onMeet={() => {}}
          onLook={() => {}}
        />
      );
    case 'LD1-loading-sprout':
      return <GardenLoader phase="sprout" />;
    case 'LD3-loading-bee':
      return <GardenLoader phase="bee" word="bloom" />;
    case 'AU2-create-account':
    case 'AU2-create-account-donate':
    case 'AU3-create-account-invite':
      return (
        <RegisterScreen
          locale={locale}
          onLanguageChange={() => {}}
          onSubmit={() => {}}
          backHref={AUTH_HREFS.login}
          signInHref={AUTH_HREFS.login}
          joining={name === 'AU3-create-account-invite'}
          invite={name === 'AU3-create-account-invite' ? REGISTER.invite[locale] : null}
          initialName={REGISTER.name}
          donation={
            name === 'AU3-create-account-invite'
              ? null
              : {
                  howHref: GARDEN_ROUTES.reference('A8e-privacy'),
                  initialChecked: name === 'AU2-create-account-donate',
                }
          }
        />
      );
    case 'AU4-reset-password':
    case 'AU4-reset-password-sent':
      return (
        <ForgotPasswordScreen
          locale={locale}
          onLanguageChange={() => {}}
          onSubmit={() => {}}
          onResend={() => {}}
          sentTo={name === 'AU4-reset-password-sent' ? FORGOT_PASSWORD.email : null}
          backHref={AUTH_HREFS.login}
          signInHref={AUTH_HREFS.login}
          initialEmail={FORGOT_PASSWORD.email}
        />
      );
    case 'H1-home-phone':
    case 'H2-home-desktop':
    case 'H3-home-v2-phone':
    case 'H4-home-v2-desktop':
    case 'H3s-plant-bloomed':
    case 'H3s-pain-flipped':
    case 'H3s-uses-travel': {
      // HP-11: the state boards start HomeScreen in that state (plantedWord / flippedPains / useCaseBed).
      const board: {
        layout: 'phone' | 'desktop';
        width: number;
        plantedWord?: string;
        flippedPains?: readonly PainKey[];
        useCaseBed?: UseCaseBedKey;
      } = HOME_REFERENCE[name];
      return (
        <div style={{ width: board.width }}>
          <HomeScreen
            locale={locale}
            onLanguageChange={() => {}}
            registerHref={AUTH_HREFS.register}
            loginHref={AUTH_HREFS.login}
            layout={board.layout}
            plantedWord={board.plantedWord}
            flippedPains={board.flippedPains ? [...board.flippedPains] : undefined}
            useCaseBed={board.useCaseBed}
          />
        </div>
      );
    }
  }
}
