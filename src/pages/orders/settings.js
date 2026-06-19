import FlowPageLayout from "views/modules/FlowPageLayout";
import SalesSettingsForm from "components/organisms/orders/SalesSettingsForm";

const SalesSettingsPage = () => (
  <FlowPageLayout
    title="Reglas de venta"
    subtitle="Configura el vendaje y la comisión de vendedores externos"
  >
    <SalesSettingsForm />
  </FlowPageLayout>
);

export default SalesSettingsPage;
