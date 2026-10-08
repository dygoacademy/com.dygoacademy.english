Error: Vitest cannot be imported in a CommonJS module using require(). Please use "import" instead.

If you are using "import" in your source code, then it's possible it was bundled into require() automatically by your bundler. In that case, do not bundle CommonJS output since it will never work with Vitest, or use dynamic import() which is available in all CommonJS modules.

   at src/app/(garden)/garden/routeStates.test.tsx:4

  2 | import { NextIntlClientProvider } from 'next-intl';
  3 | import type { ReactElement } from 'react';
> 4 | import { describe, expect, it, vi } from 'vitest';
    | ^
  5 |
  6 | import en from '../../../../messages/en-US.json';
  7 | import vi_messages from '../../../../messages/vi-VN.json';
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/node_modules/vitest/index.cjs:1:7)
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/src/app/(garden)/garden/routeStates.test.tsx:4:1)
Error: Vitest cannot be imported in a CommonJS module using require(). Please use "import" instead.

If you are using "import" in your source code, then it's possible it was bundled into require() automatically by your bundler. In that case, do not bundle CommonJS output since it will never work with Vitest, or use dynamic import() which is available in all CommonJS modules.

   at src/components/garden/AccountSheet.test.tsx:4

  2 | import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
  3 | import { act, fireEvent, screen, waitFor } from '@testing-library/react';
> 4 | import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
    | ^
  5 |
  6 | import { renderWithIntl } from '@/test/render';
  7 |
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/node_modules/vitest/index.cjs:1:7)
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/src/components/garden/AccountSheet.test.tsx:4:1)
SyntaxError: await is only valid in async functions and the top level bodies of modules
Error: Vitest cannot be imported in a CommonJS module using require(). Please use "import" instead.

If you are using "import" in your source code, then it's possible it was bundled into require() automatically by your bundler. In that case, do not bundle CommonJS output since it will never work with Vitest, or use dynamic import() which is available in all CommonJS modules.

   at src/components/garden/auth/ForgotPasswordScreen.test.tsx:2

  1 | import { fireEvent, screen } from '@testing-library/react';
> 2 | import { describe, expect, it, vi } from 'vitest';
    | ^
  3 |
  4 | import { renderWithIntl } from '@/test/render';
  5 |
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/node_modules/vitest/index.cjs:1:7)
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/src/components/garden/auth/ForgotPasswordScreen.test.tsx:2:1)
Error: Vitest cannot be imported in a CommonJS module using require(). Please use "import" instead.

If you are using "import" in your source code, then it's possible it was bundled into require() automatically by your bundler. In that case, do not bundle CommonJS output since it will never work with Vitest, or use dynamic import() which is available in all CommonJS modules.

   at src/components/garden/auth/RegisterScreen.test.tsx:2

  1 | import { fireEvent, screen } from '@testing-library/react';
> 2 | import { describe, expect, it, vi } from 'vitest';
    | ^
  3 |
  4 | import { renderWithIntl } from '@/test/render';
  5 |
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/node_modules/vitest/index.cjs:1:7)
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/src/components/garden/auth/RegisterScreen.test.tsx:2:1)
Error: Vitest cannot be imported in a CommonJS module using require(). Please use "import" instead.

If you are using "import" in your source code, then it's possible it was bundled into require() automatically by your bundler. In that case, do not bundle CommonJS output since it will never work with Vitest, or use dynamic import() which is available in all CommonJS modules.

   at src/components/garden/auth/SignInScreen.test.tsx:2

  1 | import { fireEvent, screen } from '@testing-library/react';
> 2 | import { describe, expect, it, vi } from 'vitest';
    | ^
  3 |
  4 | import { renderWithIntl } from '@/test/render';
  5 |
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/node_modules/vitest/index.cjs:1:7)
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/src/components/garden/auth/SignInScreen.test.tsx:2:1)
Error: Vitest cannot be imported in a CommonJS module using require(). Please use "import" instead.

If you are using "import" in your source code, then it's possible it was bundled into require() automatically by your bundler. In that case, do not bundle CommonJS output since it will never work with Vitest, or use dynamic import() which is available in all CommonJS modules.

   at src/components/garden/BottomSheet.test.tsx:2

  1 | import { fireEvent, screen } from '@testing-library/react';
> 2 | import { describe, expect, it, vi } from 'vitest';
    | ^
  3 |
  4 | import { renderWithIntl } from '@/test/render';
  5 |
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/node_modules/vitest/index.cjs:1:7)
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/src/components/garden/BottomSheet.test.tsx:2:1)
Error: Vitest cannot be imported in a CommonJS module using require(). Please use "import" instead.

If you are using "import" in your source code, then it's possible it was bundled into require() automatically by your bundler. In that case, do not bundle CommonJS output since it will never work with Vitest, or use dynamic import() which is available in all CommonJS modules.

   at src/components/garden/BottomTabBar.test.tsx:2

  1 | import { screen } from '@testing-library/react';
> 2 | import { describe, expect, it } from 'vitest';
    | ^
  3 |
  4 | import { renderWithIntl } from '@/test/render';
  5 |
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/node_modules/vitest/index.cjs:1:7)
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/src/components/garden/BottomTabBar.test.tsx:2:1)
Error: Vitest cannot be imported in a CommonJS module using require(). Please use "import" instead.

If you are using "import" in your source code, then it's possible it was bundled into require() automatically by your bundler. In that case, do not bundle CommonJS output since it will never work with Vitest, or use dynamic import() which is available in all CommonJS modules.

   at src/components/garden/EmptyState.test.tsx:2

  1 | import { screen } from '@testing-library/react';
> 2 | import { describe, expect, it, vi } from 'vitest';
    | ^
  3 |
  4 | import { renderWithIntl } from '@/test/render';
  5 |
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/node_modules/vitest/index.cjs:1:7)
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/src/components/garden/EmptyState.test.tsx:2:1)
Error: Vitest cannot be imported in a CommonJS module using require(). Please use "import" instead.

If you are using "import" in your source code, then it's possible it was bundled into require() automatically by your bundler. In that case, do not bundle CommonJS output since it will never work with Vitest, or use dynamic import() which is available in all CommonJS modules.

   at src/components/garden/format.test.ts:1

> 1 | import { describe, expect, it } from 'vitest';
    | ^
  2 |
  3 | import {
  4 |   calendarDay,
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/node_modules/vitest/index.cjs:1:7)
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/src/components/garden/format.test.ts:1:1)
Error: Vitest cannot be imported in a CommonJS module using require(). Please use "import" instead.

If you are using "import" in your source code, then it's possible it was bundled into require() automatically by your bundler. In that case, do not bundle CommonJS output since it will never work with Vitest, or use dynamic import() which is available in all CommonJS modules.

   at src/components/garden/groups.test.tsx:2

  1 | import { fireEvent, screen, within } from '@testing-library/react';
> 2 | import { describe, expect, it, vi } from 'vitest';
    | ^
  3 |
  4 | import { renderWithIntl } from '@/test/render';
  5 |
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/node_modules/vitest/index.cjs:1:7)
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/src/components/garden/groups.test.tsx:2:1)
Error: Vitest cannot be imported in a CommonJS module using require(). Please use "import" instead.

If you are using "import" in your source code, then it's possible it was bundled into require() automatically by your bundler. In that case, do not bundle CommonJS output since it will never work with Vitest, or use dynamic import() which is available in all CommonJS modules.

   at src/components/garden/groupsTab.test.tsx:2

  1 | import { screen } from '@testing-library/react';
> 2 | import { describe, expect, it } from 'vitest';
    | ^
  3 |
  4 | import { renderWithIntl } from '@/test/render';
  5 |
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/node_modules/vitest/index.cjs:1:7)
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/src/components/garden/groupsTab.test.tsx:2:1)
Error: Vitest cannot be imported in a CommonJS module using require(). Please use "import" instead.

If you are using "import" in your source code, then it's possible it was bundled into require() automatically by your bundler. In that case, do not bundle CommonJS output since it will never work with Vitest, or use dynamic import() which is available in all CommonJS modules.

   at src/components/garden/ipadNav.test.tsx:2

  1 | import { screen } from '@testing-library/react';
> 2 | import { describe, expect, it } from 'vitest';
    | ^
  3 |
  4 | import { isGardenIpadNavOn } from '@/constants/garden';
  5 | import { renderWithIntl } from '@/test/render';
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/node_modules/vitest/index.cjs:1:7)
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/src/components/garden/ipadNav.test.tsx:2:1)
Error: Vitest cannot be imported in a CommonJS module using require(). Please use "import" instead.

If you are using "import" in your source code, then it's possible it was bundled into require() automatically by your bundler. In that case, do not bundle CommonJS output since it will never work with Vitest, or use dynamic import() which is available in all CommonJS modules.

   at src/components/garden/LanguageSheet.test.tsx:2

  1 | import { fireEvent, screen } from "@testing-library/react";
> 2 | import { describe, expect, it, vi } from "vitest";
    | ^
  3 |
  4 | import { renderWithIntl } from "@/test/render";
  5 |
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/node_modules/vitest/index.cjs:1:7)
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/src/components/garden/LanguageSheet.test.tsx:2:1)
Error: Vitest cannot be imported in a CommonJS module using require(). Please use "import" instead.

If you are using "import" in your source code, then it's possible it was bundled into require() automatically by your bundler. In that case, do not bundle CommonJS output since it will never work with Vitest, or use dynamic import() which is available in all CommonJS modules.

   at src/components/garden/live/bed.test.ts:1

> 1 | import { describe, expect, it } from 'vitest';
    | ^
  2 |
  3 | import { toBedWords, type GardenTopicWord } from './data';
  4 |
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/node_modules/vitest/index.cjs:1:7)
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/src/components/garden/live/bed.test.ts:1:1)
Error: Vitest cannot be imported in a CommonJS module using require(). Please use "import" instead.

If you are using "import" in your source code, then it's possible it was bundled into require() automatically by your bundler. In that case, do not bundle CommonJS output since it will never work with Vitest, or use dynamic import() which is available in all CommonJS modules.

   at src/components/garden/live/data.test.ts:1

> 1 | import { describe, expect, it } from 'vitest';
    | ^
  2 |
  3 | import { displayName, greetingFor, missedDays, sampleGarden, weekOf } from './data';
  4 |
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/node_modules/vitest/index.cjs:1:7)
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/src/components/garden/live/data.test.ts:1:1)
Error: Vitest cannot be imported in a CommonJS module using require(). Please use "import" instead.

If you are using "import" in your source code, then it's possible it was bundled into require() automatically by your bundler. In that case, do not bundle CommonJS output since it will never work with Vitest, or use dynamic import() which is available in all CommonJS modules.

   at src/components/garden/live/groupData.test.ts:1

> 1 | import { describe, expect, it } from 'vitest';
    | ^
  2 |
  3 | import {
  4 |   avatarRow,
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/node_modules/vitest/index.cjs:1:7)
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/src/components/garden/live/groupData.test.ts:1:1)
Error: Vitest cannot be imported in a CommonJS module using require(). Please use "import" instead.

If you are using "import" in your source code, then it's possible it was bundled into require() automatically by your bundler. In that case, do not bundle CommonJS output since it will never work with Vitest, or use dynamic import() which is available in all CommonJS modules.

   at src/components/garden/live/topics.test.ts:1

> 1 | import { describe, expect, it } from 'vitest';
    | ^
  2 |
  3 | import { leadingStage } from '../screens/TopicsScreen';
  4 | import { sortBedsByDue, toScreenTopic } from './data';
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/node_modules/vitest/index.cjs:1:7)
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/src/components/garden/live/topics.test.ts:1:1)
Error: Vitest cannot be imported in a CommonJS module using require(). Please use "import" instead.

If you are using "import" in your source code, then it's possible it was bundled into require() automatically by your bundler. In that case, do not bundle CommonJS output since it will never work with Vitest, or use dynamic import() which is available in all CommonJS modules.

   at src/components/garden/MissionRow.test.tsx:2

  1 | import { screen } from '@testing-library/react';
> 2 | import { describe, expect, it } from 'vitest';
    | ^
  3 |
  4 | import { renderWithIntl } from '@/test/render';
  5 |
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/node_modules/vitest/index.cjs:1:7)
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/src/components/garden/MissionRow.test.tsx:2:1)
Error: Vitest cannot be imported in a CommonJS module using require(). Please use "import" instead.

If you are using "import" in your source code, then it's possible it was bundled into require() automatically by your bundler. In that case, do not bundle CommonJS output since it will never work with Vitest, or use dynamic import() which is available in all CommonJS modules.

   at src/components/garden/PlantGlyph.test.tsx:2

  1 | import { render } from '@testing-library/react';
> 2 | import { describe, expect, it } from 'vitest';
    | ^
  3 |
  4 | import { PLANT_GLYPH_SIZES, PlantGlyph } from './PlantGlyph';
  5 | import { PLANT_STAGES } from './plantStage';
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/node_modules/vitest/index.cjs:1:7)
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/src/components/garden/PlantGlyph.test.tsx:2:1)
Error: Vitest cannot be imported in a CommonJS module using require(). Please use "import" instead.

If you are using "import" in your source code, then it's possible it was bundled into require() automatically by your bundler. In that case, do not bundle CommonJS output since it will never work with Vitest, or use dynamic import() which is available in all CommonJS modules.

   at src/components/garden/plantStage.test.ts:1

> 1 | import { describe, expect, it } from 'vitest';
    | ^
  2 |
  3 | import { stageFromSrs, type GardenFsrsState, type SrsPlantStage } from './plantStage';
  4 |
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/node_modules/vitest/index.cjs:1:7)
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/src/components/garden/plantStage.test.ts:1:1)
Error: Vitest cannot be imported in a CommonJS module using require(). Please use "import" instead.

If you are using "import" in your source code, then it's possible it was bundled into require() automatically by your bundler. In that case, do not bundle CommonJS output since it will never work with Vitest, or use dynamic import() which is available in all CommonJS modules.

   at src/components/garden/RatingBar.test.tsx:2

  1 | import { fireEvent, screen } from '@testing-library/react';
> 2 | import { describe, expect, it, vi } from 'vitest';
    | ^
  3 |
  4 | import { renderWithIntl } from '@/test/render';
  5 |
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/node_modules/vitest/index.cjs:1:7)
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/src/components/garden/RatingBar.test.tsx:2:1)
Error: Vitest cannot be imported in a CommonJS module using require(). Please use "import" instead.

If you are using "import" in your source code, then it's possible it was bundled into require() automatically by your bundler. In that case, do not bundle CommonJS output since it will never work with Vitest, or use dynamic import() which is available in all CommonJS modules.

   at src/components/garden/ReviewCard.test.tsx:2

  1 | import { screen } from '@testing-library/react';
> 2 | import { describe, expect, it } from 'vitest';
    | ^
  3 |
  4 | import { renderWithIntl } from '@/test/render';
  5 |
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/node_modules/vitest/index.cjs:1:7)
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/src/components/garden/ReviewCard.test.tsx:2:1)
Error: Vitest cannot be imported in a CommonJS module using require(). Please use "import" instead.

If you are using "import" in your source code, then it's possible it was bundled into require() automatically by your bundler. In that case, do not bundle CommonJS output since it will never work with Vitest, or use dynamic import() which is available in all CommonJS modules.

   at src/components/garden/screens/groupScreens.test.tsx:3

  1 | import { fireEvent, render, screen, within } from '@testing-library/react';
  2 | import { NextIntlClientProvider } from 'next-intl';
> 3 | import { describe, expect, it, vi } from 'vitest';
    | ^
  4 |
  5 | import { renderWithIntl } from '@/test/render';
  6 |
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/node_modules/vitest/index.cjs:1:7)
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/src/components/garden/screens/groupScreens.test.tsx:3:1)
Error: Vitest cannot be imported in a CommonJS module using require(). Please use "import" instead.

If you are using "import" in your source code, then it's possible it was bundled into require() automatically by your bundler. In that case, do not bundle CommonJS output since it will never work with Vitest, or use dynamic import() which is available in all CommonJS modules.

   at src/components/garden/screens/quiz.test.tsx:2

  1 | import { fireEvent, screen } from '@testing-library/react';
> 2 | import { describe, expect, it, vi } from 'vitest';
    | ^
  3 |
  4 | import { toFeedback } from '@/app/(garden)/garden/quiz/feedback';
  5 | import { renderWithIntl } from '@/test/render';
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/node_modules/vitest/index.cjs:1:7)
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/src/components/garden/screens/quiz.test.tsx:2:1)
Error: Vitest cannot be imported in a CommonJS module using require(). Please use "import" instead.

If you are using "import" in your source code, then it's possible it was bundled into require() automatically by your bundler. In that case, do not bundle CommonJS output since it will never work with Vitest, or use dynamic import() which is available in all CommonJS modules.

   at src/components/garden/screens/quizResult.test.tsx:2

  1 | import { screen } from '@testing-library/react';
> 2 | import { describe, expect, it, vi } from 'vitest';
    | ^
  3 |
  4 | import { addMissed } from '@/app/(garden)/garden/quiz/results';
  5 | import { GARDEN_ROUTES } from '@/constants/garden';
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/node_modules/vitest/index.cjs:1:7)
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/src/components/garden/screens/quizResult.test.tsx:2:1)
Error: Vitest cannot be imported in a CommonJS module using require(). Please use "import" instead.

If you are using "import" in your source code, then it's possible it was bundled into require() automatically by your bundler. In that case, do not bundle CommonJS output since it will never work with Vitest, or use dynamic import() which is available in all CommonJS modules.

   at src/components/garden/screens/screens.test.tsx:3

  1 | import { fireEvent, render, screen, within } from '@testing-library/react';
  2 | import { NextIntlClientProvider } from 'next-intl';
> 3 | import { describe, expect, it, vi } from 'vitest';
    | ^
  4 |
  5 | import { renderWithIntl } from '@/test/render';
  6 |
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/node_modules/vitest/index.cjs:1:7)
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/src/components/garden/screens/screens.test.tsx:3:1)
Error: Vitest cannot be imported in a CommonJS module using require(). Please use "import" instead.

If you are using "import" in your source code, then it's possible it was bundled into require() automatically by your bundler. In that case, do not bundle CommonJS output since it will never work with Vitest, or use dynamic import() which is available in all CommonJS modules.

   at src/components/garden/StageTile.test.tsx:2

  1 | import { fireEvent, render, screen } from '@testing-library/react';
> 2 | import { describe, expect, it, vi } from 'vitest';
    | ^
  3 |
  4 | import { StageTile } from './StageTile';
  5 |
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/node_modules/vitest/index.cjs:1:7)
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/src/components/garden/StageTile.test.tsx:2:1)
Error: Vitest cannot be imported in a CommonJS module using require(). Please use "import" instead.

If you are using "import" in your source code, then it's possible it was bundled into require() automatically by your bundler. In that case, do not bundle CommonJS output since it will never work with Vitest, or use dynamic import() which is available in all CommonJS modules.

   at src/components/garden/Switch.test.tsx:2

  1 | import { fireEvent, render, screen } from '@testing-library/react';
> 2 | import { describe, expect, it, vi } from 'vitest';
    | ^
  3 |
  4 | import { Switch } from './Switch';
  5 |
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/node_modules/vitest/index.cjs:1:7)
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/src/components/garden/Switch.test.tsx:2:1)
Error: Vitest cannot be imported in a CommonJS module using require(). Please use "import" instead.

If you are using "import" in your source code, then it's possible it was bundled into require() automatically by your bundler. In that case, do not bundle CommonJS output since it will never work with Vitest, or use dynamic import() which is available in all CommonJS modules.

   at src/components/garden/Toast.test.tsx:2

  1 | import { act, render, screen } from '@testing-library/react';
> 2 | import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
    | ^
  3 |
  4 | import { Toast } from './Toast';
  5 |
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/node_modules/vitest/index.cjs:1:7)
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/src/components/garden/Toast.test.tsx:2:1)
Error: Vitest cannot be imported in a CommonJS module using require(). Please use "import" instead.

If you are using "import" in your source code, then it's possible it was bundled into require() automatically by your bundler. In that case, do not bundle CommonJS output since it will never work with Vitest, or use dynamic import() which is available in all CommonJS modules.

   at src/constants/routes.test.ts:1

> 1 | import { describe, expect, it } from 'vitest';
    | ^
  2 |
  3 | import { GARDEN_REFERENCE_PREFIX, GARDEN_ROUTES } from './garden';
  4 | import { isProtectedPath, PROTECTED_PATH_PREFIXES } from './routes';
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/node_modules/vitest/index.cjs:1:7)
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/src/constants/routes.test.ts:1:1)
Error: Vitest cannot be imported in a CommonJS module using require(). Please use "import" instead.

If you are using "import" in your source code, then it's possible it was bundled into require() automatically by your bundler. In that case, do not bundle CommonJS output since it will never work with Vitest, or use dynamic import() which is available in all CommonJS modules.

   at src/i18n/config.test.ts:1

> 1 | import { describe, expect, it } from 'vitest';
    | ^
  2 |
  3 | import {
  4 |   appLocaleOf,
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/node_modules/vitest/index.cjs:1:7)
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/src/i18n/config.test.ts:1:1)
Error: Vitest cannot be imported in a CommonJS module using require(). Please use "import" instead.

If you are using "import" in your source code, then it's possible it was bundled into require() automatically by your bundler. In that case, do not bundle CommonJS output since it will never work with Vitest, or use dynamic import() which is available in all CommonJS modules.

   at src/i18n/messages.test.ts:2

  1 | import { TYPE, parse, type MessageFormatElement } from '@formatjs/icu-messageformat-parser';
> 2 | import { describe, expect, it } from 'vitest';
    | ^
  3 |
  4 | import enUS from '../../messages/en-US.json';
  5 | import viVN from '../../messages/vi-VN.json';
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/node_modules/vitest/index.cjs:1:7)
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/src/i18n/messages.test.ts:2:1)
Error: Vitest cannot be imported in a CommonJS module using require(). Please use "import" instead.

If you are using "import" in your source code, then it's possible it was bundled into require() automatically by your bundler. In that case, do not bundle CommonJS output since it will never work with Vitest, or use dynamic import() which is available in all CommonJS modules.

   at src/lib/garden-reference.test.ts:1

> 1 | import { describe, expect, it } from 'vitest';
    | ^
  2 |
  3 | import { referencePagesAllowed } from './garden-reference';
  4 |
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/node_modules/vitest/index.cjs:1:7)
    at Object.<anonymous> (/Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend/src/lib/garden-reference.test.ts:1:1)
Error: No tests found

