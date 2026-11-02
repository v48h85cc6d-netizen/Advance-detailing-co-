import { AnimatePresence, motion } from 'motion/react';
import { useId, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Trans } from 'react-i18next';
import { useT } from '../lib/useT';
import { business } from '../config/site';
import { useLang } from '../lib/useLang';
import { NotConfiguredError, submitContact } from '../lib/submitContact';
import { useToast } from './Toast';
import { ArrowIcon } from './Icons';
import { cn } from '../lib/cn';
import { visual } from '../lib/visual';

const ve = visual('src/components/ContactForm.tsx');

type Field = 'name' | 'email' | 'message' | 'consent';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function ContactForm() {
  const { t } = useT();
  const { lang, to } = useLang();
  const toast = useToast();
  const uid = useId();
  const [values, setValues] = useState({ name: '', email: '', message: '', consent: false, website: '' });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  const validate = (v = values) => {
    const e: Partial<Record<Field, string>> = {};
    if (v.name.trim().length < 2) e.name = t('contact.form.errors.name');
    if (!EMAIL_RE.test(v.email.trim())) e.email = t('contact.form.errors.email');
    if (v.message.trim().length < 10) e.message = t('contact.form.errors.message');
    if (!v.consent) e.consent = t('contact.form.errors.consent');
    return e;
  };

  const update = <K extends keyof typeof values>(k: K, val: (typeof values)[K]) => {
    const next = { ...values, [k]: val };
    setValues(next);
    if (touched[k as Field]) setErrors(validate(next));
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === 'sending') return;
    const errs = validate();
    setErrors(errs);
    setTouched({ name: true, email: true, message: true, consent: true });
    if (Object.keys(errs).length) {
      const first = (['name', 'email', 'message', 'consent'] as Field[]).find((f) => errs[f]);
      document.getElementById(`${uid}-${first}`)?.focus();
      return;
    }
    // Honeypot: bots fill the hidden field. Silently drop without claiming delivery.
    if (values.website) return;

    setStatus('sending');
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 15000);
    try {
      await submitContact({ name: values.name.trim(), email: values.email.trim(), message: values.message.trim(), language: lang }, ctrl.signal);
      setStatus('sent');
      setValues({ name: '', email: '', message: '', consent: false, website: '' });
      setTouched({});
      toast({ kind: 'success', message: t('contact.form.success') });
    } catch (err) {
      setStatus('idle');
      const mailto = `mailto:${business.email}?subject=${encodeURIComponent(`Kontakt — ${values.name.trim()}`)}&body=${encodeURIComponent(values.message.trim())}`;
      toast({
        kind: 'error',
        message: err instanceof NotConfiguredError ? t('contact.form.notConfigured') : t('contact.form.error'),
        action: { label: t('contact.form.openEmail'), href: mailto },
      });
    } finally {
      window.clearTimeout(timer);
    }
  };

  const fieldCls = 'group relative';
  const labelCls = 'pointer-events-none absolute left-5 top-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted';
  const err = (f: Field) =>
    touched[f] && errors[f] ? (
      <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} id={`${uid}-${f}-err`} className="mt-2 text-sm text-red-500" role="alert">
        {errors[f]}
      </motion.p>
    ) : null;

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5" data-testid="contact-form" aria-busy={status === 'sending'}>
      <div className={fieldCls}>
        <label htmlFor={`${uid}-name`} className={labelCls}>
          {t('contact.form.name')} *
        </label>
        <input
          id={`${uid}-name`}
          name="name"
          autoComplete="name"
          className="field"
          value={values.name}
          onChange={(e) => update('name', e.target.value)}
          onBlur={() => {
            setTouched((x) => ({ ...x, name: true }));
            setErrors(validate());
          }}
          aria-invalid={Boolean(touched.name && errors.name)}
          aria-describedby={errors.name ? `${uid}-name-err` : undefined}
          required
          maxLength={120}
        />
        {err('name')}
      </div>
      <div className={fieldCls}>
        <label htmlFor={`${uid}-email`} className={labelCls}>
          {t('contact.form.email')} *
        </label>
        <input
          id={`${uid}-email`}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          className="field"
          value={values.email}
          onChange={(e) => update('email', e.target.value)}
          onBlur={() => {
            setTouched((x) => ({ ...x, email: true }));
            setErrors(validate());
          }}
          aria-invalid={Boolean(touched.email && errors.email)}
          aria-describedby={errors.email ? `${uid}-email-err` : undefined}
          required
          maxLength={160}
        />
        {err('email')}
      </div>
      <div className={fieldCls}>
        <label htmlFor={`${uid}-message`} className={labelCls}>
          {t('contact.form.message')} *
        </label>
        <textarea
          id={`${uid}-message`}
          name="message"
          rows={6}
          className="field min-h-40 resize-y !pt-8"
          value={values.message}
          onChange={(e) => update('message', e.target.value)}
          onBlur={() => {
            setTouched((x) => ({ ...x, message: true }));
            setErrors(validate());
          }}
          aria-invalid={Boolean(touched.message && errors.message)}
          aria-describedby={errors.message ? `${uid}-message-err` : undefined}
          required
          maxLength={4000}
        />
        {err('message')}
      </div>

      {/* Honeypot (hidden from people and assistive tech) */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={values.website} onChange={(e) => update('website', e.target.value)} />
        </label>
      </div>

      <div>
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-fg-2">
          <input
            id={`${uid}-consent`}
            type="checkbox"
            checked={values.consent}
            onChange={(e) => {
              update('consent', e.target.checked);
              setTouched((x) => ({ ...x, consent: true }));
            }}
            aria-invalid={Boolean(touched.consent && errors.consent)}
            className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-[var(--fg)]"
          />
          <span>
            <Trans t={t} i18nKey="contact.form.consent" components={{ privacy: <Link to={to('/privacy')} className="underline underline-offset-4" /> }} />
          </span>
        </label>
        {err('consent')}
      </div>

      <button {...ve('contact.form.submit', 'button', { key: 'contact.form.submit' })} type="submit" disabled={status === 'sending'} className={cn('btn btn-primary mt-2 w-full sm:w-auto sm:self-start')} data-testid="contact-submit">
        <AnimatePresence mode="wait" initial={false}>
          {status === 'sending' ? (
            <motion.span key="s" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex items-center gap-3">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
              {t('contact.form.sending')}
            </motion.span>
          ) : (
            <motion.span key="i" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex items-center gap-3">
              {t('contact.form.submit')}
              <ArrowIcon width={16} height={16} />
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </form>
  );
}
