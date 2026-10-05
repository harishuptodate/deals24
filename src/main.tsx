import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const preloadReloadKey = 'deals24:preload-reload-at';
const preloadReloadCooldownMs = 10_000;

window.addEventListener('vite:preloadError', (event) => {
  const now = Date.now();
  const lastReload = Number(sessionStorage.getItem(preloadReloadKey));

  if (!lastReload || now - lastReload > preloadReloadCooldownMs) {
    event.preventDefault();
    sessionStorage.setItem(preloadReloadKey, String(now));
    window.location.reload();
  }
});

setTimeout(() => {
  sessionStorage.removeItem(preloadReloadKey);
}, preloadReloadCooldownMs);

createRoot(document.getElementById("root")!).render(<App />);
