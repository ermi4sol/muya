import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/AuthShell";
import { TelegramLoginButton } from "@/components/auth/TelegramLoginButton";
import { Link } from "@/i18n/navigation";
import { env } from "@/lib/env";

export default async function SigninPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const t = await getTranslations("auth");
  const { redirect } = await searchParams;
  return (
    <AuthShell>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-ink">{t("signinTitle")}</h1>
        <p className="mt-2 text-sm text-ink-soft">{t("telegramSigninBody")}</p>
      </div>
      <div className="mt-6">
        <TelegramLoginButton
          botUsername={env.telegramBotUsername()}
          intent="creator"
          redirectTo={redirect}
        />
      </div>
      <p className="mt-5 text-center text-sm">
        <Link href="/signup" className="font-medium text-primary-700">
          {t("switchToSignup")}
        </Link>
      </p>
    </AuthShell>
  );
}
