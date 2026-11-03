import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import './styles/index.css';
import './i18n';
import App from './App';
import { ThemeProvider } from './lib/theme';
import { ConsentProvider } from './lib/consent';
import { ToastProvider } from './components/Toast';
import { installInteractionSounds } from './lib/sound';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ConsentProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </ConsentProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);

installInteractionSounds();
