import { motion } from 'motion/react';
import { useT } from '../lib/useT';
import { business, fullAddress, maps } from '../config/site';
import { ArrowUpRight, CoffeeIcon, MailIcon, PhoneIcon, PinIcon } from './Icons';
import { visual } from '../lib/visual';

const ve = visual('src/components/ContactInfo.tsx');

export function ContactInfo() {
  const { t } = useT();
  const items = [
    { icon: PinIcon, label: t('contact.addressLabel'), value: fullAddress, href: maps.directionsUrl, external: true, cta: t('contact.directions'), testid: 'contact-directions' },
    { icon: PhoneIcon, label: t('contact.phoneLabel'), value: business.phone.display, href: business.phone.href, testid: 'contact-phone' },
    { icon: MailIcon, label: t('contact.emailLabel'), value: business.email, href: `mailto:${business.email}`, testid: 'contact-email' },
  ];
  return (
    <div className="flex flex-col gap-4">
      <p {...ve('contact.invitation', 'card')} className="flex items-center gap-4 rounded-3xl border border-line bg-surface p-6 text-lg font-medium sm:text-xl">
        <CoffeeIcon width={28} height={28} className="shrink-0" />
        <span className="serif-accent text-2xl sm:text-3xl">{t('contact.invitation')}</span>
      </p>
      {items.map(({ icon: Icon, ...it }) => (
        <motion.a
          key={it.label}
          {...ve(`contact.info.${it.testid.replace('contact-', '')}`, 'card')}
          href={it.href}
          data-testid={it.testid}
          {...(it.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          whileHover={{ x: 4 }}
          className="group flex items-center justify-between gap-5 rounded-3xl border border-line bg-surface p-6 transition-colors hover:border-line-strong"
        >
          <span className="flex min-w-0 items-center gap-5">
            <span className="grid grid-cols-1 h-12 w-12 shrink-0 place-items-center rounded-2xl border border-line">
              <Icon />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-muted">{it.label}</span>
              <span className="text-base font-medium [overflow-wrap:anywhere] sm:text-lg">{it.value}</span>
              {it.cta && <span className="mt-1 text-sm text-fg-2 underline underline-offset-4">{it.cta}</span>}
            </span>
          </span>
          <ArrowUpRight className="shrink-0 text-muted transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg" />
        </motion.a>
      ))}
    </div>
  );
}
