import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './platform/ui/tokens.css';
import App from './App';
import { startSync } from './platform/sync/sync';

startSync();
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
