import type { SystemRole } from "@/lib/domain/constants";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      roles: SystemRole[];
    };
  }

  interface User {
    roles?: SystemRole[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    roles?: SystemRole[];
  }
}
