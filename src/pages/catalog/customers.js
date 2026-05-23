import { useEffect, useState } from "react";
import catalogService from "services/catalog/catalog-service";
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

const CustomersPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const response = await catalogService.getCustomers({ page: 1, pageSize: 20 });
        if (response?.code !== 1) {
          setError(response?.message || "No se pudo cargar el catalogo de clientes");
          return;
        }
        setItems(normalizeList(response.data));
      } catch (requestError) {
        setError("Error de red al cargar clientes");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  return (
    <CatalogListView
      title="Clientes"
      subtitle="Listado operativo de clientes"
      loading={loading}
      error={error}
      items={items}
      nameField="full_name"
    />
  );
};

export default CustomersPage;
