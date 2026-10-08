import { HomePageBody, homeMetadata } from '@/components/home/homePage';

export const generateMetadata = () => homeMetadata('en-US');

/**
 * `/` for signed-out visitors (Home page HP-1): the public home page in
 * English, canvas page "Home page" (`reference/H1-home-phone`,
 * `H2-home-desktop`). `/vi` and `/zh` are the same page in Vietnamese and
 * Chinese (SEO, 2026-10-07). Signed in, middleware sends all three to
 * /garden before this renders.
 */
export default function HomePage() {
  return <HomePageBody />;
}
