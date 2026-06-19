import AtomicOrderForm from "components/organisms/orders/AtomicOrderForm";
import FlowPageLayout from "views/modules/FlowPageLayout";

const OrdersCountPage = () => (
  <FlowPageLayout
    title="Nuevo pedido"
    subtitle="Captura productos por valor o cantidad para tus clientes asignados"
  >
    <AtomicOrderForm />
  </FlowPageLayout>
);

export default OrdersCountPage;
