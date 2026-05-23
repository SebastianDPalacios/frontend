import Button from "@mui/material/Button";

const AppButton = ({ children, variant = "contained", color = "primary", ...props }) => {
  return (
    <Button variant={variant} color={color} {...props}>
      {children}
    </Button>
  );
};

export default AppButton;
