import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './editor.css';
import { Editor } from './Editor';

if (!import.meta.env.DEV) throw new Error('The Visual Editor is development-only.');

createRoot(document.getElementById('editor-root')!).render(
  <StrictMode>
    <Editor />
  </StrictMode>,
);
