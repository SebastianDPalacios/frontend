import { MenuItem, TextField } from "@mui/material";

const lineTypes = [
  { value: "sale", label: "Venta" },
  { value: "bonus", label: "Vendaje" },
  { value: "gift", label: "Obsequio" },
  { value: "exchange", label: "Cambio" },
];

const OrderLineTypeSelect = ({ value, onChange, disabled = false }) => (
  <TextField
    select
    fullWidth
    size="small"
    label="Tipo"
    value={value}
    onChange={(event) => onChange(event.target.value)}
    disabled={disabled}
  >
    {lineTypes.map((type) => (
      <MenuItem key={type.value} value={type.value}>
        {type.label}
      </MenuItem>
    ))}
  </TextField>
);

export { lineTypes };
export default OrderLineTypeSelect;
