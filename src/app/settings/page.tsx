import { SettingsClient } from "@/components/settings/settings-client";
import { getPageActivationStates } from "@/lib/page-activation/repository";

export default async function SettingsPage() {
  const pageActivationStates = await getPageActivationStates();

  return <SettingsClient pageActivationStates={pageActivationStates} />;
}
