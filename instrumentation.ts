export async function register() {
  // prevent this from running in the edge runtime
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NODE_ENV === 'production') {
    const { Laminar } = await import('@lmnr-ai/lmnr');
    Laminar.initialize({
      projectApiKey: process.env.LMNR_API_KEY,
      baseUrl: process.env.LMNR_BASE_URL,
      httpPort: 8000,
      grpcPort: 8001
    });
  }
}