import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/AuthShell";
import { TelegramLoginButton } from "@/components/auth/TelegramLoginButton";
import { Link } from "@/i18n/navigation";
import { env } from "@/lib/env";

export default async function SignupPage() {
  const t = await getTranslations("auth");
  return (
    <AuthShell>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-ink">{t("signupTitle")}</h1>
        <p className="mt-2 text-sm text-ink-soft">{t("telegramSignupBody")}</p>
      </div>
      <div className="mt-6">
        <TelegramLoginButton
          botUsername={env.telegramBotUsername()}
          intent="creator"
        />
      </div>
      <p className="mt-5 text-center text-sm">
        <Link href="/signin" className="font-medium text-primary-700">
          {t("switchToSignin")}
        </Link>
      </p>
    </AuthShell>
  );
}
