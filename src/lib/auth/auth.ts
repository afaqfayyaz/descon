import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { userRepo } from "@/lib/db/repositories/user.repository";
import type { SystemRole } from "@/lib/domain/constants";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const EIGHT_HOURS = 8 * 60 * 60;

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

      const user = await userRepo.findByEmail(parsed.data.email);
      if (!user || !user.passwordHash) return null;

      const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
      if (!ok) return null;

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
