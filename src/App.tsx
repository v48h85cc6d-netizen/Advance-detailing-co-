import { lazy, Suspense, useState, type ReactNode } from 'react';
import { Route, Routes, useLocation } from 'react-router';
import { Layout } from './components/Layout';
import { Intro, shouldShowIntro } from './components/Intro';
import Home from './pages/Home';
import { langFromPath } from './lib/lang';

const Services = lazy(() => import('./pages/Services'));
const About = lazy(() => import('./pages/About'));
const Gallery = lazy(() => import('./pages/Gallery'));
const Contact = lazy(() => import('./pages/Contact'));
const Project = lazy(() => import('./pages/Project'));
const Legal = lazy(() => import('./pages/Legal'));
const NotFound = lazy(() => import('./pages/NotFound'));

const PageFallback = () => <div className="min-h-[100svh]" aria-busy="true" />;
const S = ({ children }: { children: ReactNode }) => <Suspense fallback={<PageFallback />}>{children}</Suspense>;

export default function App() {
  const { pathname } = useLocation();
  const [introActive, setIntroActive] = useState(() => shouldShowIntro(langFromPath(pathname).rest));
  const ready = !introActive;

  const pages = (
    <>
      <Route index element={<Home ready={ready} />} />
      <Route path="services" element={<S><Services /></S>} />
      <Route path="about" element={<S><About /></S>} />
      <Route path="gallery" element={<S><Gallery /></S>} />
      <Route path="contact" element={<S><Contact /></S>} />
      <Route path="projects/:slug" element={<S><Project /></S>} />
      <Route path="privacy" element={<S><Legal doc="privacy" /></S>} />
      <Route path="cookies" element={<S><Legal doc="cookies" /></S>} />
      <Route path="terms" element={<S><Legal doc="terms" /></S>} />
      <Route path="*" element={<S><NotFound /></S>} />
    </>
  );

  return (
    <>
      {introActive && <Intro onDone={() => setIntroActive(false)} />}
      <Layout introActive={introActive}>
        <Routes>
          <Route path="/en">{pages}</Route>
          <Route path="/de">{pages}</Route>
          <Route path="/">{pages}</Route>
        </Routes>
      </Layout>
    </>
  );
}
