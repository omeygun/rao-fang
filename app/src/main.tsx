import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { installOfflineFetchLogger } from './dev/offlineFetchLog';
import { requestPersist } from './storage';
import '@fontsource/ibm-plex-sans-thai/thai-400.css';
import '@fontsource/ibm-plex-sans-thai/thai-600.css';
import '@fontsource/ibm-plex-sans-thai/latin-400.css';
import '@fontsource/ibm-plex-sans-thai/latin-600.css';
import './index.css';

installOfflineFetchLogger();
requestPersist(); // spec §16.2: on first launch (and again after model downloads)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
