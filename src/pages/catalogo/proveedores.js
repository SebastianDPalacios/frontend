import { useEffect, useState } from "react";
import catalogService from "services/catalog/catalog-service";
import { getApiErrorMessage } from "utils/api-error";
import CatalogListView from "views/modules/CatalogListView";

const normalizeList = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.rows)) {
    return payload.rows;
  }
  if (Array.isArray(payload?.items)) {
    return payload.items;
  }
  return [];
};

const SuppliersPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const response = await catalogService.getSuppliers({ page: 1, pageSize: 20 });
        if (response?.code !== 1) {
          setError(response?.message || "No se pudo cargar el catalogo de proveedores");
          return;
        }
        setItems(normalizeList(response.data));
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, "Error de red al cargar proveedores"));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  return (
    <CatalogListView
      title="Proveedores"
      subtitle="Listado operativo de proveedores"
      loading={loading}
      error={error}
      items={items}
      nameField="name"
    />
  );
};

export default SuppliersPage;
