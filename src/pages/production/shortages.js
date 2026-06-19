import { useEffect, useMemo, useState } from "react";
import { Alert, Grid } from "@mui/material";
import { toDateInputValue } from "@core/components/ui/balance-date-utils";
import ShortageSummaryCard from "components/molecules/ShortageSummaryCard";
import JustifiedShortageFilters from "components/organisms/production/JustifiedShortageFilters";
import JustifiedShortageHistory from "components/organisms/production/JustifiedShortageHistory";
import catalogService from "services/catalog/catalog-service";
import productionService from "services/production/production-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { normalizeRows } from "views/modules/flow-utils";

const PAGE_SIZE = 10;
const numberFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 });

const getInitialFilters = () => {
  const today = toDateInputValue();

  return {
    search: "",
    branchId: "",
    productId: "",
    missingReason: "all",
    dateFrom: `${today.slice(0, 7)}-01`,
    dateTo: today,
  };
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const ProductionShortagesPage = () => {
  const [filters, setFilters] = useState(getInitialFilters);
  const [page, setPage] = useState(1);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({});

  useEffect(() => {
    const loadCatalogs = async () => {
      setCatalogLoading(true);
      try {
        const [branchesResponse, productionResponse] = await Promise.all([
          catalogService.getBranches({ onlyActive: 1 }),
          productionService.getBaseData({ onlyActive: 1, page: 1, pageSize: 200 }),
        ]);

        if (branchesResponse?.code !== 1 || productionResponse?.code !== 1) {
          setError("No se pudieron cargar los filtros de sucursales y productos.");
          return;
        }

        setBranches(normalizeRows(branchesResponse.data));
        setProducts(normalizeRows(productionResponse.data?.products));
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Error al cargar los filtros."));
      } finally {
        setCatalogLoading(false);
      }
    };

    loadCatalogs();
  }, []);

  useEffect(() => {
    const loadShortages = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await productionService.getJustifiedShortages({
          branchId: filters.branchId || undefined,
          productId: filters.productId || undefined,
          missingReason: filters.missingReason,
          search: filters.search.trim() || undefined,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
          page,
          pageSize: PAGE_SIZE,
        });

        if (response?.code !== 1) {
          setItems([]);
          setTotal(0);
          setSummary({});
          setError(response?.message || "No se pudo cargar el historial de faltantes.");
          return;
        }

        setItems(normalizeRows(response.data));
        setTotal(Number(response.data?.total || 0));
        setSummary(response.data?.summary || {});
      } catch (requestError) {
        setItems([]);
        setTotal(0);
        setSummary({});
        setError(getErrorMessage(requestError, "Error al cargar los faltantes justificados."));
      } finally {
        setLoading(false);
      }
    };

    loadShortages();
  }, [filters, page]);

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const currentPage = Math.min(page, totalPages);
  const topProduct = summary.top_product;
  const hasRepeatedProduct = Number(topProduct?.cases_count || 0) >= 3;
  const hasSuspectedTheft = Number(summary.suspected_theft_cases || 0) > 0;

  const summaryCards = useMemo(
    () => [
      {
        label: "Unidades faltantes",
        value: numberFormatter.format(Number(summary.missing_quantity || 0)),
        helper: "No ingresaron al inventario de venta",
        color: "warning.main",
      },
      {
        label: "Casos reportados",
        value: numberFormatter.format(Number(summary.cases_count || 0)),
        helper: "Registros con motivo y explicación",
      },
      {
        label: "Productos afectados",
        value: numberFormatter.format(Number(summary.affected_products || 0)),
        helper: "Productos distintos",
      },
      {
        label: "Producto con más faltantes",
        value: topProduct?.product_name || "Sin datos",
        helper: topProduct
          ? `${numberFormatter.format(Number(topProduct.missing_quantity || 0))} unidades en ${topProduct.cases_count} casos`
          : "No hay faltantes en el periodo",
        color: hasRepeatedProduct ? "error.main" : "text.primary",
      },
    ],
    [hasRepeatedProduct, summary, topProduct]
  );

  const updateFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(getInitialFilters());
    setPage(1);
  };

  return (
    <FlowPageLayout
      title="Faltantes justificados"
      subtitle="Controla las diferencias encontradas durante el conteo y empaque."
      links={[
        { label: "Resumen del día", href: "/production/day" },
        { label: "Reporte mensual", href: "/production/month" },
        { label: "Lotes y empaque", href: "/production/packaging" },
        { label: "Faltantes", href: "/production/shortages", active: true },
      ]}
    >
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {hasSuspectedTheft ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Hay {summary.suspected_theft_cases} caso(s) marcados como posible extravío en el periodo seleccionado.
        </Alert>
      ) : null}
      {hasRepeatedProduct ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          {topProduct.product_name} presenta faltantes repetidos: {topProduct.cases_count} casos.
        </Alert>
      ) : null}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {summaryCards.map((card) => (
          <Grid item xs={12} sm={6} lg={3} key={card.label}>
            <ShortageSummaryCard {...card} />
          </Grid>
        ))}
      </Grid>

      <JustifiedShortageFilters
        branches={branches}
        products={products}
        filters={filters}
        onChange={updateFilter}
        onClear={clearFilters}
        loading={catalogLoading}
      />

      <JustifiedShortageHistory
        items={items}
        loading={loading}
        total={total}
        pageSize={PAGE_SIZE}
        currentPage={currentPage}
        totalPages={totalPages}
        onPreviousPage={() => setPage((current) => Math.max(current - 1, 1))}
        onNextPage={() => setPage((current) => Math.min(current + 1, totalPages))}
        formatNumber={(value) => numberFormatter.format(Number(value || 0))}
        formatDate={(value) => String(value || "").slice(0, 10)}
      />
    </FlowPageLayout>
  );
};

export default ProductionShortagesPage;
