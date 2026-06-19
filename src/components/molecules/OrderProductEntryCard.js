import { Box, Button, Chip, Stack, TextField, Typography } from "@mui/material";
import ColombianCurrencyField, { formatCurrencyValue } from "components/atoms/ColombianCurrencyField";
import CaptureModeSwitch from "components/atoms/CaptureModeSwitch";
import OrderLineTypeSelect from "components/atoms/OrderLineTypeSelect";

const typeColors = {
  sale: "secondary",
  bonus: "success",
  gift: "info",
  exchange: "warning",
};

const OrderProductEntryCard = ({ product, entry, calculation, onChange }) => {
  const active = calculation.quantity > 0;
  const update = (changes) => onChange({ ...entry, ...changes });

  return (
    <Box
      sx={{
        border: 1,
        borderColor: active ? `${typeColors[entry.lineType]}.main` : "divider",
        borderRadius: 2,
        p: 2,
        bgcolor: active ? "action.selected" : "background.paper",
        minWidth: 0,
      }}
    >
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 900, overflowWrap: "anywhere" }}>
              {product.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ${formatCurrencyValue(product.base_price, 0)} por {product.unit || "unidad"}
            </Typography>
          </Box>
          {active ? (
            <Chip size="small" color={typeColors[entry.lineType]} label={`${calculation.quantity} uds.`} />
          ) : null}
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <OrderLineTypeSelect
            value={entry.lineType}
            onChange={(lineType) => update({ lineType })}
          />
          <CaptureModeSwitch
            mode={entry.captureMode}
            onChange={(captureMode) => update({ captureMode, value: "" })}
          />
        </Stack>

        {entry.captureMode === "amount" ? (
          <ColombianCurrencyField
            size="small"
            label="Valor solicitado"
            name={`amount-${product.id}`}
            value={entry.value}
            onChange={(event) => update({ value: event.target.value })}
            helperText={active ? `Se cargarán ${calculation.quantity} unidades` : " "}
          />
        ) : (
          <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
            <Button
              variant="outlined"
              color="secondary"
              aria-label={`Restar ${product.name}`}
              onClick={() => update({ value: Math.max(Number(entry.value || 0) - 1, 0) || "" })}
              sx={{ minWidth: 48, height: 48 }}
            >
              -
            </Button>
            <TextField
              fullWidth
              size="small"
              type="number"
              label="Cantidad"
              value={entry.value}
              onChange={(event) => update({ value: event.target.value })}
              inputProps={{ min: 0, step: 1, inputMode: "numeric" }}
              helperText=" "
            />
            <Button
              variant="contained"
              color="secondary"
              aria-label={`Sumar ${product.name}`}
              onClick={() => update({ value: Number(entry.value || 0) + 1 })}
              sx={{ minWidth: 48, height: 48 }}
            >
              +
            </Button>
          </Stack>
        )}

        {active ? (
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "baseline" }}>
            <Typography variant="caption" color="text.secondary">
              {entry.lineType === "sale" ? "Total cobrado" : "Valor comercial"}
            </Typography>
            <Typography sx={{ fontWeight: 900 }}>
              ${formatCurrencyValue(calculation.commercialValue, 0)}
            </Typography>
          </Stack>
        ) : null}
      </Stack>
    </Box>
  );
};

export default OrderProductEntryCard;
