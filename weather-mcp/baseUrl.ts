export const baseURL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://" +
      (process.env.VERCEL_PROJECT_PRODUCTION_URL ||
        process.env.VERCEL_URL || 
        "chatgpt-apps-sdk-nextjs-starter-tau.vercel.app");
