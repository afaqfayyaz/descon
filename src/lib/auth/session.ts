import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/lib/auth/auth";
import type { Session } from "next-auth";

/** Returns the current session or redirects to /login. */
export async function requireSession(): Promise<Session> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

/** Current user's ObjectId from the session (throws if unauthenticated). */
export async function currentUserId(): Promise<ObjectId> {
  const session = await requireSession();
  return new ObjectId(session.user.id);
}
