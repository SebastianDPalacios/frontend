import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { toDateInputValue } from "@core/components/ui/balance-date-utils";
import productionService from "services/production/production-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { normalizeRows } from "views/modules/flow-utils";

const numberFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 });
const formatNumber = (value) => numberFormatter.format(Number(value || 0));
const getErrorMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback;

const addDays = (date, days) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return toDateInputValue(copy);
};

const groupRows = (rows) => rows.reduce((dayAcc, row) => {
  const dayKey = String(row.usage_date || "Sin fecha").slice(0, 10);
  if (!dayAcc[dayKey]) {
    dayAcc[dayKey] = { date: dayKey, recipes: {} };
  }

  const recipeKey = String(row.recipe_id || "sin-receta");
  if (!dayAcc[dayKey].recipes[recipeKey]) {
    dayAcc[dayKey].recipes[recipeKey] = {
      recipeId: row.recipe_id,
      recipeName: row.recipe_name || "Receta sin nombre",
      recipeVersion: row.recipe_version,
      products: {},
      totalQuantity: 0,
    };
  }

  const productKey = String(row.product_id || "sin-producto");
  if (!dayAcc[dayKey].recipes[recipeKey].products[productKey]) {
    dayAcc[dayKey].recipes[recipeKey].products[productKey] = {
      productId: row.product_id,
      productName: row.product_name || "Producto sin nombre",
      productSku: row.product_sku,
      producedQuantity: Number(row.produced_quantity || 0),
      materials: [],
      totalQuantity: 0,
    };
  }

  dayAcc[dayKey].recipes[recipeKey].products[productKey].materials.push(row);
  dayAcc[dayKey].recipes[recipeKey].products[productKey].totalQuantity += Number(row.total_quantity || 0);
  dayAcc[dayKey].recipes[recipeKey].totalQuantity += Number(row.total_quantity || 0);
  return dayAcc;
}, {});

const ProductionMaterialUsagePage = () => {
  const today = toDateInputValue();
  const [filters, setFilters] = useState({
    dateFrom: addDays(new Date(), -7),
    dateTo: today,
    branchId: "",
    recipeId: "",
    search: "",
  });
  const [branches, setBranches] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [report, setReport] = useState({ rows: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCatalogs = useCallback(async () => {
    try {
      const response = await productionService.getBaseData({ onlyActive: 1, pageSize: 200 });
      if (response?.code === 1) {
        setBranches(normalizeRows(response.data?.branches));
        setRecipes(normalizeRows(response.data?.recipes));
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError, "No se pudo cargar filtros de produccion."));
    }
  }, []);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await productionService.getRawMaterialUsageByProductReport({
        dateFrom: filters.dateFrom || null,
        dateTo: filters.dateTo || null,
        branchId: filters.branchId || null,
        recipeId: filters.recipeId || null,
      });

      if (response?.code !== 1) {
        setError(response?.message || "No se pudo cargar el reporte.");
        return;
      }

      setReport({
        rows: normalizeRows(response.data?.rows),
        summary: response.data?.summary || {},
      });
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al cargar materias primas usadas."));
    } finally {
      setLoading(false);
    }
  }, [filters.branchId, filters.dateFrom, filters.dateTo, filters.recipeId]);

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const filteredRows = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    if (!term) return report.rows;
    return report.rows.filter((row) => [
      row.recipe_name,
      row.product_name,
      row.product_sku,
      row.raw_material_name,
      row.raw_material_category,
    ].some((value) => String(value || "").toLowerCase().includes(term)));
  }, [filters.search, report.rows]);

  const groupedDays = useMemo(() => Object.values(groupRows(filteredRows))
    .map((day) => ({
      ...day,
      recipes: Object.values(day.recipes).map((recipe) => ({
        ...recipe,
        products: Object.values(recipe.products),
      })),
    })), [filteredRows]);

  const updateFilter = (field) => (event) => {
    setFilters((current) => ({ ...current, [field]: event.target.value }));
  };

  return (
    <FlowPageLayout
      title="Materias primas usadas por producto"
      subtitle="Consulta por dia, receta y producto final cuanto insumo se utilizo. Funciona como historico por rango de fechas."
    >
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {loading ? <Alert severity="info" sx={{ mb: 2 }}>Cargando materias primas usadas...</Alert> : null}

      <Box sx={{ mb: 3, p: { xs: 2, md: 3 }, border: "1px solid", borderColor: "divider", borderRadius: 3, bgcolor: "background.paper" }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>Filtros del historico</Typography>
            <Typography color="text.secondary">Elige fechas, sucursal o receta para revisar el consumo real y estimado.</Typography>
          </Box>
          <Chip label={`${filteredRows.length} registro(s)`} variant="outlined" />
        </Stack>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField fullWidth type="date" label="Desde" value={filters.dateFrom} onChange={updateFilter("dateFrom")} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth type="date" label="Hasta" value={filters.dateTo} onChange={updateFilter("dateTo")} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth select label="Sucursal" value={filters.branchId} onChange={updateFilter("branchId")}>
              <MenuItem value="">Todas</MenuItem>
              {branches.map((branch) => <MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth select label="Receta" value={filters.recipeId} onChange={updateFilter("recipeId")}>
              <MenuItem value="">Todas</MenuItem>
              {recipes.map((recipe) => (
                <MenuItem key={recipe.id} value={recipe.id}>
                  {recipe.name || recipe.product_name || `Receta #${recipe.id}`} - V{recipe.version_no}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Buscar producto, receta o materia prima" value={filters.search} onChange={updateFilter("search")} />
          </Grid>
        </Grid>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Box sx={{ p: 2.5, border: "1px solid", borderColor: "divider", borderRadius: 3, bgcolor: "background.paper" }}>
            <Typography color="text.secondary">Dias con consumo</Typography>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>{formatNumber(report.summary?.days_count)}</Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={3}>
          <Box sx={{ p: 2.5, border: "1px solid", borderColor: "divider", borderRadius: 3, bgcolor: "background.paper" }}>
            <Typography color="text.secondary">Recetas</Typography>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>{formatNumber(report.summary?.recipes_count)}</Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={3}>
          <Box sx={{ p: 2.5, border: "1px solid", borderColor: "divider", borderRadius: 3, bgcolor: "background.paper" }}>
            <Typography color="text.secondary">Productos finales</Typography>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>{formatNumber(report.summary?.products_count)}</Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={3}>
          <Box sx={{ p: 2.5, border: "1px solid", borderColor: "divider", borderRadius: 3, bgcolor: "background.paper" }}>
            <Typography color="text.secondary">Consumo total</Typography>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>{formatNumber(report.summary?.total_quantity)}</Typography>
          </Box>
        </Grid>
      </Grid>

      <Stack spacing={2}>
        {!groupedDays.length && !loading ? (
          <Alert severity="info">No hay consumo de materias primas para los filtros seleccionados.</Alert>
        ) : null}

        {groupedDays.map((day) => (
          <Box key={day.date} sx={{ p: { xs: 2, md: 3 }, border: "1px solid", borderColor: "divider", borderRadius: 3, bgcolor: "background.paper" }}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>{day.date}</Typography>
                <Typography color="text.secondary">Consumo separado por receta y producto final.</Typography>
              </Box>
              <Chip label={`${day.recipes.length} receta(s)`} color="primary" variant="outlined" />
            </Stack>

            <Stack spacing={2}>
              {day.recipes.map((recipe) => (
                <Paper key={recipe.recipeId} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                  <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 900 }}>{recipe.recipeName}</Typography>
                      <Typography color="text.secondary">Version {recipe.recipeVersion || "-"}</Typography>
                    </Box>
                    <Chip label={`Total: ${formatNumber(recipe.totalQuantity)}`} />
                  </Stack>

                  <Stack spacing={2}>
                    {recipe.products.map((product) => (
                      <Box key={product.productId} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
                        <Box sx={{ px: 2, py: 1.5, bgcolor: "grey.50" }}>
                          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
                            <Box>
                              <Typography sx={{ fontWeight: 900 }}>{product.productName}</Typography>
                              <Typography color="text.secondary" variant="body2">{product.productSku || "Sin SKU"}</Typography>
                            </Box>
                            <Typography sx={{ fontWeight: 800 }}>Producido: {formatNumber(product.producedQuantity)}</Typography>
                          </Stack>
                        </Box>
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Materia prima</TableCell>
                                <TableCell>Categoria</TableCell>
                                <TableCell align="right">Base receta</TableCell>
                                <TableCell align="right">Directo producto</TableCell>
                                <TableCell align="right">Total</TableCell>
                                <TableCell>Unidad</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {product.materials.map((material) => (
                                <TableRow key={`${material.raw_material_id}-${material.raw_material_name}`}>
                                  <TableCell sx={{ fontWeight: 800 }}>{material.raw_material_name}</TableCell>
                                  <TableCell>{material.raw_material_category || "Sin categoria"}</TableCell>
                                  <TableCell align="right">{formatNumber(material.base_quantity)}</TableCell>
                                  <TableCell align="right">{formatNumber(material.direct_quantity)}</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 900 }}>{formatNumber(material.total_quantity)}</TableCell>
                                  <TableCell>{material.raw_material_unit}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    ))}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>
    </FlowPageLayout>
  );
};

export default ProductionMaterialUsagePage;