import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/tokens.css';
import './styles/app.css';

// The guest intake flow at /g/<token> is a separate app now
// (Vikteur/rekord-couple); the proxy routes those URLs there, so everything
// that reaches this bundle is the DJ app. Still no router dependency.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
