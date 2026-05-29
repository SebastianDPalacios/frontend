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

const TaxRatesPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const response = await catalogService.getTaxRates({ onlyActive: 1 });
        if (response?.code !== 1) {
          setError(response?.message || "No se pudo cargar el catalogo de tasas de impuesto");
          return;
        }
        setItems(normalizeList(response.data));
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, "Error de red al cargar tasas de impuesto"));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  return (
    <CatalogListView
      title="Tasas de impuesto"
      subtitle="Listado operativo de tasas de impuesto"
      loading={loading}
      error={error}
      items={items}
      nameField="name"
    />
  );
};

export default TaxRatesPage;
