export function register() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    console.info(
      "[instrumentation] NEXT_PUBLIC_SENTRY_DSN is set; add @sentry/nextjs and Sentry.init as needed.",
    );
  }
}
