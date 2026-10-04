import { ipaSegments } from '@/lib/speaking/ipa';

/** "/ˈmɪt.ɪ.ɡeɪt/" with the stressed syllable bold (gold on SP1; pass a class to change it). */
export function IpaText({
  ipa,
  stressClassName = 'text-gold-text',
}: {
  ipa: string;
  stressClassName?: string;
}) {
  const segments = ipaSegments(ipa);
  if (segments.length === 0) return <>{ipa}</>;
  return (
    <>
      /
      {segments.map((s, i) => {
        if (!s.stressed) return <span key={i}>{s.text}</span>;
        const marks = /^[.ˈˌ]*/.exec(s.text)?.[0] ?? '';
        return (
          <span key={i}>
            {marks}
            <b className={stressClassName}>{s.text.slice(marks.length)}</b>
          </span>
        );
      })}
      /
    </>
  );
}
