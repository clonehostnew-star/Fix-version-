/* eslint-disable no-console */
// Postinstall check: warn if optional AI deps are missing so the app can still run.
(async () => {
  try {
    const resolver = (0, eval)('require').resolve;
    const has = (name) => {
      try { resolver(name); return true; } catch { return false; }
    };

    const hasGenkit = has('genkit');
    const hasGoogleAI = has('@genkit-ai/googleai');
    if (!hasGenkit || !hasGoogleAI) {
      console.warn('[postinstall] Optional AI packages not installed: ' +
        `${hasGenkit ? '' : 'genkit '} ${hasGoogleAI ? '' : '@genkit-ai/googleai '}`.trim());
      console.warn('[postinstall] AI features will be disabled. The site will continue to work.');
      console.warn('[postinstall] To enable AI locally: npm i genkit genkit-cli @genkit-ai/googleai');
    }
  } catch (err) {
    // Ignore failures; never block installation
  }
})();

