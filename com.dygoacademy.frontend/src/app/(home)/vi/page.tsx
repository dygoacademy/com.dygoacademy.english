import { HomePageBody, homeMetadata } from '@/components/home/homePage';

export const generateMetadata = () => homeMetadata('vi-VN');

/** `/vi`: the public home page in Vietnamese (SEO, 2026-10-07); see `(home)/page.tsx`. */
export default function HomePageVi() {
  return <HomePageBody />;
}
