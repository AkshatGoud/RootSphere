import { ChatPanel } from "@/components/ChatPanel";
import { chatApi } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";

/** Cross-field chat. Bound to the farmer's whole farm via /chat/dashboard.
 *  Trigger sits at bottom-right; on the Dashboard there's no mobile bottom
 *  nav action bar competing for that real estate, so it can sit lower. */
export function DashboardChat() {
  const { t } = useLanguage();
  return (
    <ChatPanel
      title={t("Ask about your farm")}
      subtitle={t("Local AI · Gemma 4")}
      emptyHint={t("Ask anything across all your fields — moisture levels, weather risks, what to focus on today.")}
      suggestions={[
        t("Which of my fields needs water?"),
        t("Which field needs the most attention today?"),
        t("Are any of my fields at risk?"),
      ]}
      send={(body) => chatApi.sendDashboard(body)}
      triggerLabel={t("Ask about your farm")}
      triggerPosition="bottom-right-low"
    />
  );
}
