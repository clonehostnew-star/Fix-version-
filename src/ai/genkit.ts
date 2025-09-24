// Provide a resilient AI facade: use Genkit when available, otherwise export a
// minimal stub so the app never crashes if AI deps are missing in production.
// This avoids build/runtime failures on hosts that skip optional deps.

let realAi: any = null;

try {
  // Use eval to avoid bundlers statically resolving these imports
  // when the dependencies are not installed.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const req: any = (0, eval)('require');
  const { genkit } = req('genkit');
  const { googleAI } = req('@genkit-ai/googleai');
  const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  const plugin = apiKey ? googleAI({ apiKey }) : googleAI();
  realAi = genkit({
    plugins: [plugin],
    model: 'googleai/gemini-2.0-flash',
  });
} catch (_err) {
  // Intentionally empty – fall back to stub below
}

export const ai: any = realAi ?? {
  // Fallback implementations mirror the real API surface used by the app.
  definePrompt: (_opts: any) => {
    return async (input: any) => ({ output: input });
  },
  defineFlow: (_opts: any, handler: (input: any) => Promise<any> | any) => {
    return async (input: any) => handler(input);
  },
  __disabled: true,
};

export const aiAvailable: boolean = !!realAi;
