import React from 'react';
import ReactDOM from 'react-dom/client';

import '@/i18n';
import { ToastContainer } from '@/components/ui/toast';
import App from './App';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
    <ToastContainer />
  </React.StrictMode>
);
