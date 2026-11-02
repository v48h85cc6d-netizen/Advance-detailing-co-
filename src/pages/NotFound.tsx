import { Link } from 'react-router';
import { useT } from '../lib/useT';
import { PageHeader } from '../components/PageHeader';
import { usePageSeo } from '../lib/usePageSeo';
import { useLang } from '../lib/useLang';

export default function NotFound() {
  const { t } = useT();
  const { to } = useLang();
  usePageSeo('notFound', { noindex: true });
  return (
    <div className="min-h-[70vh]">
      <PageHeader eyebrow="404" title={t('notFound.title')} text={t('notFound.text')}>
        <Link to={to('/')} className="btn btn-primary self-start">
          {t('notFound.cta')}
        </Link>
      </PageHeader>
    </div>
  );
}
