import { useEffect, useMemo, useState } from "react";
import ordersService from "services/orders/orders-service";
import BaseDataView from "views/modules/BaseDataView";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { getTotal } from "views/modules/flow-utils";

const OrdersDayPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sections, setSections] = useState([]);
  const flowLinks = useMemo(
    () => [
      { label: "Dia", href: "/orders/day", active: true },
      { label: "Historico", href: "/orders/history" },
      { label: "Conteo", href: "/orders/count" },
    ],
    []
  );

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const response = await ordersService.getBaseData({ onlyActive: 1, page: 1, pageSize: 20 });
        if (response?.code !== 1) {
          setError(response?.message || "No se pudo cargar base de pedidos");
          return;
        }

        setSections([
          { key: "customers", label: "Clientes", total: getTotal(response.data?.customers) },
          { key: "routes", label: "Repartidores (no disponible)", total: getTotal(response.data?.routes) },
          { key: "products", label: "Productos", total: getTotal(response.data?.products) },
        ]);
      } catch (requestError) {
        setError("Error de red al cargar pedidos");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  return (
    <FlowPageLayout title="Pedidos - Dia" subtitle="Resumen del flujo diario de pedidos" links={flowLinks}>
      <BaseDataView
        title="Base de pedidos"
        subtitle="Catalogos operativos para captura"
        loading={loading}
        error={error}
        sections={sections}
      />
    </FlowPageLayout>
  );
};

export default OrdersDayPage;
