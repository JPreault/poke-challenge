import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/config";

export async function getRequiredSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session;
}
