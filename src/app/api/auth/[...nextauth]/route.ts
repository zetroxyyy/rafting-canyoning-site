import { handlers } from "@/lib/auth";

// These two lines are the "Shields" that stop the Vercel crash
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const { GET, POST } = handlers;