import { AuthShell } from "@/components/auth/AuthShell";
import { MagicLinkForm } from "@/components/auth/MagicLinkForm";

export default function RestorePage() {
  return (
    <AuthShell>
      <MagicLinkForm ownerType="customer" variant="restore" />
    </AuthShell>
  );
}
