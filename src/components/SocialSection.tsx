import { motion } from 'motion/react';
import { useT } from '../lib/useT';
import { social } from '../config/site';
import { ArrowUpRight, SocialIcon } from './Icons';
import { Reveal, SectionHeading } from './Reveal';

export function SocialSection() {
  const { t } = useT();
  return (
    <section className="section border-t border-line" aria-labelledby="social-title" data-testid="social">
      <div className="container-lux">
        <div id="social-title">
          <SectionHeading eyebrow={t('social.eyebrow')} title={t('social.title')} text={t('social.text')} />
        </div>
        <Reveal className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
          {social.map((s) => (
            <motion.a
              key={s.id}
              data-reveal
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`social-${s.id}`}
              whileHover={{ y: -6 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              aria-label={`${t('social.follow', { network: s.label })} (${t('common.opensNewTab')})`}
              className="group card-lux flex items-center justify-between gap-6 p-7 transition-colors duration-500 hover:bg-invert-bg hover:text-invert-fg sm:p-8"
            >
              <span className="flex items-center gap-5">
                <span className="grid grid-cols-1 h-14 w-14 place-items-center rounded-2xl border border-line transition-colors duration-500 group-hover:border-invert-fg/20">
                  <SocialIcon id={s.id} width={24} height={24} />
                </span>
                <span className="flex flex-col">
                  <span className="text-lg font-semibold">{s.label}</span>
                  <span className="text-sm opacity-60">{s.handle}</span>
                </span>
              </span>
              <ArrowUpRight className="transition-transform duration-500 group-hover:-translate-y-1 group-hover:translate-x-1" />
            </motion.a>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
