import { ChatPanel } from "@/components/ChatPanel";
import { chatApi } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  fieldId: string;
}

/** Field-scoped chat. Bound to one field's data via the backend's
 *  /field/{id}/chat endpoint. Trigger sits above the mobile bottom nav. */
export function FieldChat({ fieldId }: Props) {
  const { t } = useLanguage();
  return (
    <ChatPanel
      title={t("Ask about this field")}
      subtitle={t("Local AI · Gemma 4")}
      emptyHint={t("Ask anything about this field — its sensor data, weather, recommendations, or recent photos.")}
      suggestions={[
        t("What is the soil moisture?"),
        t("Should I irrigate today?"),
        t("How is the weather forecast?"),
      ]}
      send={(body) => chatApi.send(fieldId, body)}
      triggerLabel={t("Ask about this field")}
      triggerPosition="bottom-right"
    />
  );
}
