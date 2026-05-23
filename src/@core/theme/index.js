import { createTheme } from "@mui/material/styles";

const palette = {
  mode: "light",
  primary: {
    main: "#111827",
    contrastText: "#ffffff",
  },
  secondary: {
    main: "#ea580c",
    contrastText: "#ffffff",
  },
  background: {
    default: "#f6f8fb",
    paper: "#ffffff",
  },
  text: {
    primary: "#111827",
    secondary: "#4b5563",
  },
};

const theme = createTheme({
  palette,
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: "-0.01em",
    },
    h5: {
      fontWeight: 700,
      letterSpacing: "-0.01em",
    },
    h6: {
      fontWeight: 700,
    },
    button: {
      fontWeight: 600,
      textTransform: "none",
    },
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
          paddingInline: 18,
          minHeight: 40,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: "1px solid #e5e7eb",
          boxShadow: "0 6px 20px rgba(15, 23, 42, 0.06)",
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: "small",
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
  },
});

export default theme;
