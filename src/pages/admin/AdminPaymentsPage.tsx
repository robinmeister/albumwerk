import { ReactElement } from "react";

import HelpBanner from "../../components/feedback/HelpBanner";
import Page from "../../components/layout/Page";
import PaymentSettings from "../../features/Settings/components/PaymentSettings";
import { useSettings } from "../../context/SettingsContext";

export default function AdminPaymentsPage(): ReactElement {
  const { settings } = useSettings();
  // With neither provider configured, "Verkauf" shootings cannot be completed —
  // worth pointing out before a customer runs into it.
  const hasProvider = Boolean(settings.paypalEnabled) || Boolean(settings.stripeEnabled);

  return (
    <Page
      title="Zahlungen"
      subtitle="Lege fest, wie deine Kunden bezahlen können. Beide Anbieter lassen sich unabhängig voneinander einrichten."
      showTitleOnMobile
    >
      <HelpBanner
        slug="zahlungen-paypal"
        title="Noch keine Zahlungsart eingerichtet"
        description="Solange weder PayPal noch Kartenzahlung eingerichtet ist, können deine Kunden Shootings vom Typ „Verkauf“ nicht abschließen."
        isHidden={hasProvider}
      />
      <PaymentSettings />
    </Page>
  );
}
