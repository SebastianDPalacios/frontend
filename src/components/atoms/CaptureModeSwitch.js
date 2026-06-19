import { FormControlLabel, Switch } from "@mui/material";

const CaptureModeSwitch = ({ mode, onChange, disabled = false }) => (
  <FormControlLabel
    control={
      <Switch
        checked={mode === "amount"}
        onChange={(event) => onChange(event.target.checked ? "amount" : "quantity")}
        color="secondary"
        disabled={disabled}
      />
    }
    label={mode === "amount" ? "Ingresar valor" : "Ingresar cantidad"}
    sx={{ m: 0, "& .MuiFormControlLabel-label": { fontSize: 13, fontWeight: 800 } }}
  />
);

export default CaptureModeSwitch;
