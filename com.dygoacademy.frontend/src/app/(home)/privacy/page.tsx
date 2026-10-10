import { LegalRoute, legalMetadata } from '@/components/legal/legalRoute';

export const generateMetadata = () => legalMetadata('privacy');

/** `/privacy`: Privacy Policy (canvas page "Legal", LG2 desktop / LG4 phone). */
export default function PrivacyPage() {
  return <LegalRoute kind="privacy" />;
}
