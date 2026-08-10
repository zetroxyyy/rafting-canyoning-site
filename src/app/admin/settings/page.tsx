/**
 * Admin Settings Page
 *
 * Sections:
 *   1. Security (admin password)
 *   2. Promo Code Manager
 *   3. System (maintenance mode, promo banner, off-season, and notification emails)
 */
import { getSettings } from "@/app/actions/admin/settings";
import { listPromos } from "@/app/actions/admin/promos";
import SettingsSections from "@/components/admin/SettingsSections";

export default async function AdminSettingsPage() {
  const [settings, promos] = await Promise.all([
    getSettings(),
    listPromos(),
  ]);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-stone-900 tracking-tight">Settings</h2>
        <p className="text-sm text-stone-500 mt-0.5 font-medium">
          Global application configuration. Changes take effect immediately.
        </p>
      </div>

      <SettingsSections settings={settings} promos={promos} />
    </div>
  );
}
