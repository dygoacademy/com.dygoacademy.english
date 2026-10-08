import { HomePageBody, homeMetadata } from '@/components/home/homePage';

export const generateMetadata = () => homeMetadata('zh-CN');

/** `/zh`: the public home page in Chinese (SEO, 2026-10-07); see `(home)/page.tsx`. */
export default function HomePageZh() {
  return <HomePageBody />;
}
