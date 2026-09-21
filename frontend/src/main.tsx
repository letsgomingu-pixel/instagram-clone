import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { markStandaloneClass, registerServiceWorker } from '@/pwa';
import './index.css';

markStandaloneClass();
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
