import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/AuthShell";
import { MagicLinkForm } from "@/components/auth/MagicLinkForm";
import { Link } from "@/i18n/navigation";

export default async function SignupPage() {
  const t = await getTranslations("auth");
  return (
    <AuthShell>
      <MagicLinkForm ownerType="creator" variant="signup" />
      <p className="mt-5 text-center text-sm">
        <Link href="/signin" className="font-medium text-primary-700">
          {t("switchToSignin")}
        </Link>
      </p>
    </AuthShell>
  );
}
