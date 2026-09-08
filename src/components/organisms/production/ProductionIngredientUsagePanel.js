import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Autocomplete, Box, Chip, Grid, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import FormField from "@core/components/ui/FormField";
import { BalanceDatePicker, BalanceMonthPicker, BalanceWeekPicker } from "@core/components/ui/BalancePeriodPickers";
import { getFortnightRange, getIsoWeekInputValue, getMonthRange, getWeekRange, parseInputDate } from "@core/components/ui/balance-date-utils";
import productionService from "services/production/production-service";
import { normalizeRows } from "views/modules/flow-utils";

const numberFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 });
const formatNumber = (value) => numberFormatter.format(Number(value || 0));
const getWeekValue = (value) => {
  return getIsoWeekInputValue(parseInputDate(value));
};
const getPeriodValue = (period, referenceDate) => {
  if (period === "week") return getWeekValue(referenceDate);
  if (["fortnight", "month"].includes(period)) return String(referenceDate).slice(0, 7);
  return referenceDate;
};
const getRange = (period, periodValue, fortnightHalf) => {
  if (period === "week") {
    const range = getWeekRange(periodValue);
    return { dateFrom: range.from, dateTo: range.to };
  }
  if (period === "fortnight") {
    const range = getFortnightRange(periodValue, fortnightHalf);
    return { dateFrom: range.from, dateTo: range.to };
  }
  if (period === "month") {
    const range = getMonthRange(periodValue);
    return { dateFrom: range.from, dateTo: range.to };
  }
  return { dateFrom: periodValue, dateTo: periodValue };
};

const ProductionIngredientUsagePanel = ({ branchId, referenceDate, refreshKey }) => {
  const [period, setPeriod] = useState("day");
  const [periodValue, setPeriodValue] = useState(referenceDate);
  const [fortnightHalf, setFortnightHalf] = useState(Number(String(referenceDate).slice(8, 10)) <= 15 ? "1" : "2");
  const [category, setCategory] = useState("");
  const [productId, setProductId] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const range = useMemo(() => getRange(period, periodValue, fortnightHalf), [fortnightHalf, period, periodValue]);

  useEffect(() => {
    setPeriodValue(getPeriodValue(period, referenceDate));
    setFortnightHalf(Number(String(referenceDate).slice(8, 10)) <= 15 ? "1" : "2");
  }, [period, referenceDate]);

  const changePeriod = (event) => {
    const nextPeriod = event.target.value;
    setPeriod(nextPeriod);
    setPeriodValue(getPeriodValue(nextPeriod, referenceDate));
  };

  const loadUsage = useCallback(async () => {
    if (!branchId || !referenceDate) return;
    setLoading(true);
    setError(null);
    try {
      const response = await productionService.getRawMaterialUsageByProductReport({
        ...range,
        branchId,
      });
      if (response?.code !== 1) throw new Error(response?.message || "No se pudo cargar el consumo de ingredientes.");
      setRows(normalizeRows(response.data?.rows));
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || "No se pudo cargar el consumo de ingredientes.");
    } finally {
      setLoading(false);
    }
  }, [branchId, range, referenceDate]);

  useEffect(() => { loadUsage(); }, [loadUsage, refreshKey]);

  const categories = useMemo(() => [...new Set(rows.map((row) => row.product_category || "Sin categoría"))]
    .sort((a, b) => a.localeCompare(b, "es")), [rows]);

  useEffect(() => {
    if (category && !categories.includes(category)) setCategory("");
  }, [categories, category]);

  const categoryRows = useMemo(() => category
    ? rows.filter((row) => (row.product_category || "Sin categoría") === category)
    : rows, [category, rows]);

  const productOptions = useMemo(() => {
    const options = new Map();
    categoryRows.forEach((row) => {
      options.set(String(row.product_id), {
        id: String(row.product_id),
        name: row.product_name || "Producto sin nombre",
      });
    });
    return [...options.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [categoryRows]);

  useEffect(() => {
    if (productId && !productOptions.some((product) => product.id === productId)) setProductId("");
  }, [productId, productOptions]);

  const selectedProduct = productOptions.find((product) => product.id === productId) || null;
  const visibleRows = useMemo(() => productId
    ? categoryRows.filter((row) => String(row.product_id) === productId)
    : categoryRows, [categoryRows, productId]);

  const products = useMemo(() => {
    const productionByDay = new Map();
    visibleRows.forEach((row) => {
      const key = `${String(row.usage_date).slice(0, 10)}-${row.recipe_id}-${row.product_id}`;
      productionByDay.set(key, {
        productId: row.product_id,
        name: row.product_name || "Producto sin nombre",
        quantity: Math.max(Number(productionByDay.get(key)?.quantity || 0), Number(row.produced_quantity || 0)),
      });
    });
    const totals = new Map();
    productionByDay.forEach((product) => {
      const current = totals.get(String(product.productId)) || { ...product, quantity: 0 };
      current.quantity += product.quantity;
      totals.set(String(product.productId), current);
    });
    return [...totals.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [visibleRows]);

  const ingredientGroups = useMemo(() => {
    const groups = new Map();
    visibleRows.forEach((row) => {
      const groupName = row.product_category || "Sin categoría";
      if (!groups.has(groupName)) groups.set(groupName, new Map());
      const key = `${row.raw_material_id}-${row.raw_material_unit}`;
      const current = groups.get(groupName).get(key) || {
        id: row.raw_material_id,
        name: row.raw_material_name || "Ingrediente sin nombre",
        unit: row.raw_material_unit || "unidad",
        quantity: 0,
      };
      current.quantity += Number(row.total_quantity || 0);
      groups.get(groupName).set(key, current);
    });
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "es"))
      .map(([name, ingredients]) => ({ name, ingredients: [...ingredients.values()].sort((a, b) => a.name.localeCompare(b.name, "es")) }));
  }, [visibleRows]);

  return (
    <Paper variant="outlined" sx={{ mt: 3, borderRadius: { xs: 3, md: 4 }, overflow: "hidden" }}>
      <Box sx={{ p: { xs: 2, md: 3 }, borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.default" }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 950 }}>Ingredientes utilizados</Typography>
          <Typography color="text.secondary">Cálculo automático según la producción reportada y la receta vigente.</Typography>
          <Typography variant="caption" color="text.secondary">Desde {range.dateFrom} hasta {range.dateTo}</Typography>
        </Box>

        <Box
          sx={{
            mt: 2.5,
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              lg: period === "fortnight"
                ? "0.8fr 1.15fr 0.8fr 1.2fr 1.35fr"
                : "0.8fr 1.15fr 1.2fr 1.35fr",
            },
            gap: 1.5,
            alignItems: "start",
            "& .MuiFormControl-root": { width: "100%" },
          }}
        >
            <FormField select size="small" name="period" label="Periodo" value={period} onChange={changePeriod}>
              <MenuItem value="day">Diario</MenuItem>
              <MenuItem value="week">Semanal</MenuItem>
              <MenuItem value="fortnight">Quincenal</MenuItem>
              <MenuItem value="month">Mensual</MenuItem>
            </FormField>
            {period === "day" ? <BalanceDatePicker fullWidth label="Fecha" value={periodValue} onChange={setPeriodValue} /> : null}
            {period === "week" ? <BalanceWeekPicker label="Semana" value={periodValue} onChange={setPeriodValue} /> : null}
            {["fortnight", "month"].includes(period) ? <BalanceMonthPicker fullWidth label="Mes" value={periodValue} onChange={setPeriodValue} /> : null}
            {period === "fortnight" ? (
              <FormField select size="small" name="fortnight" label="Quincena" value={fortnightHalf} onChange={(event) => setFortnightHalf(event.target.value)}>
                <MenuItem value="1">Primera</MenuItem>
                <MenuItem value="2">Segunda</MenuItem>
              </FormField>
            ) : null}
            <FormField select size="small" name="category" label="Categoría de producto" value={category} onChange={(event) => setCategory(event.target.value)}>
              <MenuItem value="">Todas: sal, dulce y demás</MenuItem>
              {categories.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
            </FormField>
            <Autocomplete
              size="small"
              options={productOptions}
              value={selectedProduct}
              onChange={(_event, product) => setProductId(product?.id || "")}
              getOptionLabel={(product) => product.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              noOptionsText="No hay productos en esta categoría"
              renderInput={(params) => <TextField {...params} label="Producto específico" placeholder="Todos los productos" />}
            />
        </Box>
      </Box>

      {error ? <Alert severity="error" sx={{ m: 2 }}>{error}</Alert> : null}
      {loading ? <Alert severity="info" sx={{ m: 2 }}>Actualizando ingredientes...</Alert> : null}
      {!loading && !rows.length ? <Alert severity="info" sx={{ m: 2 }}>No hay producción reportada en este periodo.</Alert> : null}

      {!loading && rows.length ? (
        <Grid container>
          <Grid item xs={12} md={4} sx={{ p: { xs: 2, md: 3 }, borderRight: { md: "1px solid" }, borderColor: { md: "divider" } }}>
            <Typography variant="h6" sx={{ fontWeight: 900, mb: 1.5 }}>Productos elaborados</Typography>
            <Stack spacing={1}>
              {products.map((product) => (
                <Box key={product.productId} sx={{ p: 1.5, borderRadius: 2.5, bgcolor: "primary.main", color: "primary.contrastText" }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                    <Typography sx={{ fontWeight: 850 }}>{product.name}</Typography>
                    <Chip label={`${formatNumber(product.quantity)} unid.`} size="small" sx={{ bgcolor: "secondary.main", color: "secondary.contrastText", fontWeight: 900 }} />
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Grid>

          <Grid item xs={12} md={8} sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h6" sx={{ fontWeight: 900, mb: 1.5 }}>Consumo por categoría</Typography>
            <Stack spacing={2}>
              {ingredientGroups.map((group) => (
                <Box key={group.name} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2.5, overflow: "hidden" }}>
                  <Box sx={{ px: 2, py: 1.25, bgcolor: "rgba(221, 93, 38, 0.09)" }}>
                    <Typography sx={{ fontWeight: 900 }}>{group.name}</Typography>
                  </Box>
                  {group.ingredients.map((ingredient) => (
                    <Stack key={`${ingredient.id}-${ingredient.unit}`} direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ px: 2, py: 1.25, borderTop: "1px solid", borderColor: "divider" }}>
                      <Typography sx={{ fontWeight: 700 }}>{ingredient.name}</Typography>
                      <Chip color="primary" label={`${formatNumber(ingredient.quantity)} ${ingredient.unit}`} sx={{ fontWeight: 900, fontSize: 15 }} />
                    </Stack>
                  ))}
                </Box>
              ))}
            </Stack>
          </Grid>
        </Grid>
      ) : null}
    </Paper>
  );
};

export default ProductionIngredientUsagePanel;
