import { ssoEnabled } from "@/lib/auth/auth";
import { LoginForm } from "@/components/features/auth/login-form";

const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied:
    "Your Microsoft account isn't provisioned in Caliber. Contact HR.",
  OAuthAccountNotLinked: "This account is already linked to another sign-in.",
  Configuration: "Single sign-on is misconfigured. Contact your administrator.",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const code = searchParams.error;
  const initialError = code
    ? (ERROR_MESSAGES[code] ?? "Sign-in failed. Please try again.")
    : null;

  return <LoginForm ssoEnabled={ssoEnabled} initialError={initialError} />;
}
