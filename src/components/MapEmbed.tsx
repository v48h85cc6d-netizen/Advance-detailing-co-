import { useT } from '../lib/useT';
import { maps } from '../config/site';
import { useConsent } from '../lib/consent';
import { PinIcon } from './Icons';

/** Google Maps iframe — loaded ONLY after "External media" consent (GDPR). */
export function MapEmbed() {
  const { t } = useT();
  const { consent, save } = useConsent();
  if (consent.media) {
    return (
      <iframe
        title={t('contact.mapTitle')}
        src={maps.embedUrl}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="h-full w-full grayscale-[0.9] contrast-[1.05] dark:invert-[0.92] dark:hue-rotate-180"
        data-testid="map-iframe"
      />
    );
  }
  return (
    <div className="placeholder-surface relative flex h-full w-full flex-col items-center justify-center gap-5 p-8 text-center" data-testid="map-placeholder">
      <div className="tri-pattern absolute inset-0 opacity-50" aria-hidden="true" />
      <PinIcon width={32} height={32} className="relative text-fg-2" />
      <p className="relative max-w-sm text-sm leading-relaxed text-fg-2">{t('contact.mapConsent')}</p>
      <button type="button" onClick={() => save({ ...consent, media: true })} className="btn btn-ghost relative !py-3" data-testid="map-load">
        {t('contact.mapLoad')}
      </button>
    </div>
  );
}
