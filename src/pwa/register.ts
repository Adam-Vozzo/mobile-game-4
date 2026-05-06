/**
 * Service worker registration. vite-plugin-pwa with `registerType: 'autoUpdate'`
 * handles install + update lifecycle automatically. We just import it.
 */
export async function registerServiceWorker(): Promise<void> {
  if (import.meta.env.DEV) return;
  try {
    const { registerSW } = await import('virtual:pwa-register');
    registerSW({ immediate: true });
  } catch (err) {
    console.warn('PWA registration failed', err);
  }
}
