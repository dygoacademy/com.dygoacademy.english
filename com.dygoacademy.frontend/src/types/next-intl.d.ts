import type messages from '../../messages/en-SG.json';

/**
 * Type-checks every t('key') against the English source messages, so a
 * typo in a garden screen fails `tsc` instead of rendering the raw key.
 */
declare module 'next-intl' {
  interface AppConfig {
    Messages: typeof messages;
  }
}
