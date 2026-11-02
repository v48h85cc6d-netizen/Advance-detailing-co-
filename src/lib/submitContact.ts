import { contactForm } from '../config/site';

export interface ContactPayload {
  name: string;
  email: string;
  message: string;
  language: string;
}

export class NotConfiguredError extends Error {}

/**
 * Sends the contact form to the configured provider. Throws on any failure —
 * success is only reported when the provider confirms delivery.
 */
export async function submitContact(data: ContactPayload, signal?: AbortSignal): Promise<void> {
  const { provider, endpoint, web3formsKey, configured } = contactForm;
  if (!configured) throw new NotConfiguredError('Contact form provider not configured');

  const subject = `Mesazh i ri nga faqja — ${data.name}`;
  let url = endpoint;
  let body: Record<string, unknown> = { ...data, subject };

  if (provider === 'web3forms') {
    url = 'https://api.web3forms.com/submit';
    body = { access_key: web3formsKey, from_name: 'ADVANCE DETAILING CO. Website', subject, name: data.name, email: data.email, message: data.message, language: data.language };
  } else if (provider === 'formspree') {
    body = { name: data.name, email: data.email, message: data.message, language: data.language, _subject: subject };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  let json: { success?: boolean; ok?: boolean } | null = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (provider === 'web3forms' && json?.success !== true) throw new Error('Provider rejected the message');
  if (json && (json.ok === false || json.success === false)) throw new Error('Provider rejected the message');
}
