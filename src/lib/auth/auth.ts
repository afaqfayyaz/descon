import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { userRepo } from "@/lib/db/repositories/user.repository";
import { loginAttemptRepo } from "@/lib/db/repositories/login-attempt.repository";
import { auditService } from "@/lib/services/audit.service";
import type { SystemRole } from "@/lib/domain/constants";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const EIGHT_HOURS = 8 * 60 * 60;

/**
 * Sliding-window lockout: 5 failures per email in 15 minutes. Checked before
 * bcrypt so a locked account (or a stuffing run) can't burn CPU either.
 * Matches the TTL on the loginAttempts collection.
 */
const MAX_FAILURES = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

/** Valid bcrypt hash of a random string nobody knows; see timing note below. */
const DUMMY_HASH = bcrypt.hashSync("caliber-timing-equalizer", 12);

/** SSO is enabled only when the Azure AD app credentials are configured. */
export const ssoEnabled = Boolean(
  process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET,
);

const providers: NextAuthConfig["providers"] = [
  Credentials({
    credentials: { email: {}, password: {} },
    authorize: async (raw) => {
      const parsed = credentialsSchema.safeParse(raw);
      if (!parsed.success) return null;
      const email = parsed.data.email.toLowerCase();

      const failures = await loginAttemptRepo.countRecent(
        email,
        LOCKOUT_WINDOW_MS,
      );
      if (failures >= MAX_FAILURES) {
        await auditService.log({
          actorId: null,
          actorEmail: email,
          action: "login.locked",
          entityType: "Auth",
          metadata: { failures },
        });
        return null;
      }

      const user = await userRepo.findByEmail(email);
      // Always run one bcrypt compare so "unknown email" and "wrong password"
      // take the same time — otherwise response timing enumerates accounts.
      const ok = await bcrypt.compare(
        parsed.data.password,
        user?.passwordHash ?? DUMMY_HASH,
      );

      if (!user || !ok) {
        await loginAttemptRepo.record(email);
        await auditService.log({
          actorId: user?._id ?? null,
          actorEmail: email,
          action: "login.failed",
          entityType: "Auth",
        });
        return null;
      }

      await loginAttemptRepo.clear(email);
      await userRepo.setLastLogin(user._id);

      return {
        id: user._id.toString(),
        email: user.email,
        name: user.fullName,
        roles: user.systemRoles,
      };
    },
  }),
];

if (ssoEnabled) {
  providers.push(
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      // Defaults to the multi-tenant "common" endpoint when unset.
      tenantId: process.env.AZURE_AD_TENANT_ID,
    }),
  );
}

export const { handlers, auth, signIn } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: EIGHT_HOURS },
  pages: { signIn: "/login", error: "/login" },
  providers,
  callbacks: {
    /**
     * Gate OAuth sign-ins: only employees already provisioned (and active) in
     * our directory may sign in. Credentials are already validated in authorize.
     */
    signIn: async ({ account, user, profile }) => {
      if (!account || account.provider === "credentials") return true;
      const email = user?.email ?? (profile?.email as string | undefined);
      if (!email) return false;
      const dbUser = await userRepo.findByEmail(email);
      return Boolean(dbUser);
    },
    jwt: async ({ token, user }) => {
      if (user) {
        if (user.roles) {
          // Credentials path — user is already our domain record.
          token.uid = user.id;
          token.roles = user.roles as SystemRole[];
        } else if (user.email) {
          // OAuth path — resolve the Azure identity to our domain record.
          const dbUser = await userRepo.findByEmail(user.email);
          if (dbUser) {
            token.uid = dbUser._id.toString();
            token.roles = dbUser.systemRoles;
            await userRepo.setLastLogin(dbUser._id);
          }
        }
      }
      return token;
    },
    session: ({ session, token }) => {
      if (token.uid) session.user.id = token.uid;
      session.user.roles = token.roles ?? [];
      return session;
    },
  },
});
