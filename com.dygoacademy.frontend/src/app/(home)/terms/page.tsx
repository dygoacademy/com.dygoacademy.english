import { LegalRoute, legalMetadata } from '@/components/legal/legalRoute';

export const generateMetadata = () => legalMetadata('terms');

/** `/terms`: Terms of Service (canvas page "Legal", LG1 desktop / LG3 phone). */
export default function TermsPage() {
  return <LegalRoute kind="terms" />;
}
