import Link from "next/link";
import { Alert, Chip, Paper, Stack, Typography } from "@mui/material";
import AppButton from "@core/components/ui/AppButton";
import { formatInventoryQuantity } from "views/modules/flow-utils";

const InventoryCriticalList = ({
  title,
  subtitle,
  rows,
  emptyMessage,
  actionHref,
  getDisplayName,
  getStockState,
  formatStockEquivalent,
}) => (
  <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, height: "100%" }}>
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1}
      sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" }, mb: 2 }}
    >
      <Stack spacing={0.5}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      </Stack>
      <AppButton component={Link} href={actionHref} color="secondary" variant="outlined">
        Ver detalle
      </AppButton>
    </Stack>

    {rows.length === 0 ? (
      <Alert severity="success">{emptyMessage}</Alert>
    ) : (
      <Stack spacing={1.5}>
        {rows.map((item) => {
          const unit = item.unit || "unit";
          const state = getStockState(item);

          return (
            <Paper key={item.id} variant="outlined" sx={{ borderRadius: 2, p: 2, borderColor: `${state.color}.main` }}>
              <Stack spacing={1}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" } }}
                >
                  <Typography sx={{ fontWeight: 800 }}>{getDisplayName(item)}</Typography>
                  <Chip size="small" color={state.color} label={state.label} />
                </Stack>
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                  <Chip label={`Disponible ${formatStockEquivalent(item, unit)}`} size="small" />
                  <Chip label={`Minimo ${formatInventoryQuantity(item.min_stock, unit)} ${unit}`} size="small" variant="outlined" />
                </Stack>
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    )}
  </Paper>
);

export default InventoryCriticalList;
