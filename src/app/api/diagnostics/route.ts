export async function GET() {
  const node = process.version;
  let next = null as string | null;
  try {
    // Avoid static resolution when missing
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const req: any = (0, eval)('require');
    next = req('next/package.json').version;
  } catch {}
  const aiAvailable = (() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const resolver: any = (0, eval)('require').resolve;
      resolver('genkit');
      resolver('@genkit-ai/googleai');
      return true;
    } catch {
      return false;
    }
  })();
  const persistence = (() => {
    try {
      const { adminAvailable } = require('@/lib/firebase/admin');
      return adminAvailable();
    } catch {
      return false;
    }
  })();
  return Response.json({ node, next, aiAvailable, persistence });
}

