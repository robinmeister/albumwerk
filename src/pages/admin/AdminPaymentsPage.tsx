import { ReactElement } from "react";

import Page from "../../components/layout/Page";
import PaymentSettings from "../../features/Settings/components/PaymentSettings";

export default function AdminPaymentsPage(): ReactElement {
  return (
    <Page
      title="Zahlungen"
      subtitle="Lege fest, wie deine Kunden bezahlen können. Beide Anbieter lassen sich unabhängig voneinander einrichten."
      showTitleOnMobile
    >
      <PaymentSettings />
    </Page>
  );
}
