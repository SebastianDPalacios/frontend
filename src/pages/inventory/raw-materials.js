import { useEffect, useMemo, useState } from "react";
import inventoryService from "services/inventory/inventory-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import FlowTableCard from "views/modules/FlowTableCard";
import { getDisplayName, normalizeRows } from "views/modules/flow-utils";

const InventoryRawMaterialsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await inventoryService.getBaseData({ onlyActive: 1, page: 1, pageSize: 40 });
        if (response?.code !== 1) {
          setError(response?.message || "No se pudo cargar inventario de materias");
          return;
        }

        setRows(normalizeRows(response.data?.raw_materials));
      } catch (requestError) {
        setError("Error de red al cargar inventario de materias");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const flowLinks = useMemo(
    () => [
      { label: "Resumen", href: "/inventory/overview" },
      { label: "Ordenes compra", href: "/inventory/purchase-orders" },
      { label: "Materia prima", href: "/inventory/raw-materials", active: true },
      { label: "Productos", href: "/inventory/products" },
      { label: "Movimientos", href: "/inventory/movements" },
    ],
    []
  );

  return (
    <FlowPageLayout title="Inventario - Materia prima" subtitle="Stock base de materias primas" links={flowLinks}>
      <FlowTableCard
        title="Materias primas"
        loading={loading}
        error={error}
        columns={[{ key: "name", label: "Materia", render: (row) => getDisplayName(row) }]}
        rows={rows}
      />
    </FlowPageLayout>
  );
};

export default InventoryRawMaterialsPage;
