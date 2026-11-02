import { Link } from 'react-router';
import { useT } from '../lib/useT';
import { Hero } from '../components/Hero';
import { Marquee } from '../components/Marquee';
import { ProjectCard } from '../components/ProjectCard';
import { ServicesRail } from '../components/ServicesRail';
import { StudioSection } from '../components/StudioSection';
import { CertCarousel } from '../components/CertCarousel';
import { SocialSection } from '../components/SocialSection';
import { CtaBand } from '../components/CtaBand';
import { ImageSlot } from '../components/ImageSlot';
import { ParallaxReveal, Reveal, SectionHeading, SplitHeading } from '../components/Reveal';
import { ArrowIcon } from '../components/Icons';
import { featuredProjects, getProject } from '../config/projects';
import { coverImage, named, folderImages } from '../config/images';
import { usePageSeo } from '../lib/usePageSeo';
import { useLang } from '../lib/useLang';

export default function Home({ ready }: { ready: boolean }) {
  const { t } = useT();
  const { to } = useLang();
  usePageSeo('home');
  const lambo = getProject('lamborghini-aventador')!;
  const aboutPhoto = named('about', 'company') ?? folderImages('about')[0];

  return (
    <>
      <Hero ready={ready} />
      <Marquee />

      <section id="featured" className="section scroll-mt-24" aria-labelledby="featured-title">
        <div className="container-lux">
          <div id="featured-title">
            <SectionHeading eyebrow={t('home.featured.eyebrow')} title={t('home.featured.title')} text={t('home.featured.text')} />
          </div>
          <Reveal className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8" stagger={0.12}>
            {featuredProjects.map((p, i) => (
              <div key={p.slug} data-reveal className={i === 1 ? 'lg:translate-y-16' : ''}>
                <ProjectCard project={p} index={i} />
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <ServicesRail />
      <StudioSection />
      <CertCarousel />

      {/* Lamborghini spotlight */}
      <section className="section pt-0" aria-labelledby="spotlight-title">
        <div className="container-lux">
          <Link to={to(`/projects/${lambo.slug}`)} className="group block" data-testid="spotlight-link">
            <ParallaxReveal className="relative aspect-[4/5] rounded-[1.75rem] sm:aspect-[16/9]">
              <div data-parallax className="absolute -inset-y-[10%] inset-x-0">
                <ImageSlot
                  src={coverImage(lambo.folder)}
                  alt={t('projects.lamborghini-aventador.vehicle')}
                  folder={lambo.folder}
                  className="h-full w-full transition-transform duration-[1.6s] ease-[var(--ease-out-expo)] group-hover:scale-[1.04]"
                />
              </div>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-5 p-6 text-white sm:p-12 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex flex-col gap-4">
                  <span className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white/70">{t('home.spotlight.eyebrow')} · 1 / 500</span>
                  <h2 id="spotlight-title" className="display h-display-md max-w-[20ch]">
                    {t('projects.lamborghini-aventador.title')}
                  </h2>
                  <p className="serif-accent text-xl text-white/80 sm:text-2xl">{t('projects.lamborghini-aventador.service')}</p>
                </div>
                <span className="btn self-start border border-white/40 text-white transition-colors group-hover:bg-white group-hover:text-black">
                  {t('home.spotlight.cta')} <ArrowIcon width={16} height={16} />
                </span>
              </div>
            </ParallaxReveal>
          </Link>
        </div>
      </section>

      {/* About teaser */}
      <section className="section border-t border-line" aria-labelledby="about-teaser-title">
        <div className="container-lux grid grid-cols-1 items-center gap-14 lg:grid-cols-2 lg:gap-24">
          <ParallaxReveal className="relative aspect-[4/5] rounded-[1.75rem] lg:aspect-[5/6]">
            <div data-parallax className="absolute -inset-y-[10%] inset-x-0">
              <ImageSlot src={aboutPhoto} alt={t('about.photoAlt')} folder="about" className="h-full w-full" />
            </div>
            <span className="absolute left-6 top-6 text-silver text-7xl font-semibold tracking-tight sm:text-8xl">2019</span>
          </ParallaxReveal>
          <div className="flex flex-col gap-8">
            <span className="eyebrow">{t('home.about.eyebrow')}</span>
            <SplitHeading id="about-teaser-title" text={t('home.about.title')} className="h-display-lg" />
            <Reveal>
              <p className="lead">{t('about.founded.text')}</p>
            </Reveal>
            <Reveal>
              <Link to={to('/about')} className="btn btn-ghost">
                {t('home.about.cta')} <ArrowIcon width={16} height={16} />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      <SocialSection />
      <CtaBand title={t('home.cta.title')} text={t('home.cta.text')} />
    </>
  );
}
