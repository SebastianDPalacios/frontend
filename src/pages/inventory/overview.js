import { useEffect, useMemo, useState } from "react";
import inventoryService from "services/inventory/inventory-service";
import BaseDataView from "views/modules/BaseDataView";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { getTotal } from "views/modules/flow-utils";

const InventoryOverviewPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sections, setSections] = useState([]);
  const flowLinks = useMemo(
    () => [
      { label: "Resumen", href: "/inventory/overview", active: true },
      { label: "Ordenes compra", href: "/inventory/purchase-orders" },
      { label: "Materia prima", href: "/inventory/raw-materials" },
      { label: "Productos", href: "/inventory/products" },
      { label: "Movimientos", href: "/inventory/movements" },
    ],
    []
  );

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const response = await inventoryService.getBaseData({ onlyActive: 1, page: 1, pageSize: 20 });
        if (response?.code !== 1) {
          setError(response?.message || "No se pudo cargar base de inventario");
          return;
        }

        setSections([
          { key: "branches", label: "Sucursales", total: getTotal(response.data?.branches) },
          { key: "products", label: "Productos", total: getTotal(response.data?.products) },
          { key: "raw-materials", label: "Materias primas", total: getTotal(response.data?.raw_materials) },
        ]);
      } catch (requestError) {
        setError("Error de red al cargar inventario");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  return (
    <FlowPageLayout title="Inventario - Resumen" subtitle="Resumen del flujo operativo de inventario" links={flowLinks}>
      <BaseDataView
        title="Base de inventario"
        subtitle="Catalogos base para inventario"
        loading={loading}
        error={error}
        sections={sections}
      />
    </FlowPageLayout>
  );
};

export default InventoryOverviewPage;
