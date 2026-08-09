import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/AuthShell";
import { MagicLinkForm } from "@/components/auth/MagicLinkForm";
import { Link } from "@/i18n/navigation";

export default async function SigninPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const t = await getTranslations("auth");
  const { error } = await searchParams;
  return (
    <AuthShell>
      <MagicLinkForm ownerType="creator" variant="signin" initialError={error} />
      <p className="mt-5 text-center text-sm">
        <Link href="/signup" className="font-medium text-primary-700">
          {t("switchToSignup")}
        </Link>
      </p>
    </AuthShell>
  );
}
