import { useEffect, useMemo, useState } from "react";
import productionService from "services/production/production-service";
import BaseDataView from "views/modules/BaseDataView";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { getTotal } from "views/modules/flow-utils";

const ProductionDayPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sections, setSections] = useState([]);
  const flowLinks = useMemo(
    () => [
      { label: "Dia", href: "/production/day", active: true },
      { label: "Registrar", href: "/production/register" },
      { label: "Ordenes", href: "/production/orders" },
    ],
    []
  );

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const response = await productionService.getBaseData({ onlyActive: 1, page: 1, pageSize: 20 });
        if (response?.code !== 1) {
          setError(response?.message || "No se pudo cargar base de produccion");
          return;
        }

        setSections([
          { key: "products", label: "Productos", total: getTotal(response.data?.products) },
          { key: "raw-materials", label: "Materias primas", total: getTotal(response.data?.raw_materials) },
        ]);
      } catch (requestError) {
        setError("Error de red al cargar produccion");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  return (
    <FlowPageLayout title="Produccion - Dia" subtitle="Resumen del flujo diario de produccion" links={flowLinks}>
      <BaseDataView
        title="Base de produccion"
        subtitle="Catalogos operativos para produccion"
        loading={loading}
        error={error}
        sections={sections}
      />
    </FlowPageLayout>
  );
};

export default ProductionDayPage;
