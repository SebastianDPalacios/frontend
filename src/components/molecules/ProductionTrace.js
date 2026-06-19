import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { Box, LinearProgress, Paper, Stack, Typography } from "@mui/material";

const ProductionTrace = ({ steps }) => {
  const activeIndex = Math.max(steps.findIndex((step) => step.active), 0);
  const completedCount = steps.filter((step) => step.complete).length;
  const progress = Math.round(((completedCount + 1) / steps.length) * 100);

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 3,
        p: { xs: 2, md: 3 },
        overflow: "hidden",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={{ justifyContent: "space-between", mb: 2 }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            Estado de la producción
          </Typography>
          <Typography color="text.secondary">
            Paso {activeIndex + 1} de {steps.length}: {steps[activeIndex]?.label}
          </Typography>
        </Box>
        <Typography sx={{ fontWeight: 900, color: "secondary.main" }}>
          {progress}% completado
        </Typography>
      </Stack>

      <LinearProgress
        variant="determinate"
        value={progress}
        color={progress === 100 ? "success" : "secondary"}
        sx={{ height: 9, borderRadius: 99, mb: 3 }}
      />

      <Stack spacing={0}>
        {steps.map((step, index) => {
          const complete = step.complete;
          const active = step.active;
          const last = index === steps.length - 1;

          return (
            <Stack
              key={step.label}
              direction="row"
              spacing={2}
              sx={{
                position: "relative",
                minHeight: last ? 64 : 88,
                opacity: complete || active ? 1 : 0.58,
              }}
            >
              <Stack sx={{ alignItems: "center", flexShrink: 0 }}>
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    bgcolor: complete ? "success.main" : active ? "secondary.main" : "action.disabledBackground",
                    color: complete || active ? "common.white" : "text.secondary",
                    border: "3px solid",
                    borderColor: complete ? "success.light" : active ? "secondary.light" : "divider",
                  }}
                >
                  {complete ? (
                    <CheckRoundedIcon />
                  ) : active ? (
                    <PlayArrowRoundedIcon />
                  ) : (
                    <LockOutlinedIcon fontSize="small" />
                  )}
                </Box>
                {!last ? (
                  <Box
                    sx={{
                      width: 3,
                      flex: 1,
                      minHeight: 36,
                      bgcolor: complete ? "success.main" : "divider",
                    }}
                  />
                ) : null}
              </Stack>

              <Box
                sx={{
                  flex: 1,
                  minWidth: 0,
                  pb: last ? 0 : 2,
                  pt: 0.5,
                }}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                  <Typography sx={{ fontWeight: 900, fontSize: 17 }}>
                    {index + 1}. {step.label}
                  </Typography>
                  {active ? (
                    <Box
                      component="span"
                      sx={{
                        px: 1,
                        py: 0.25,
                        borderRadius: 99,
                        bgcolor: "rgba(219, 91, 39, 0.12)",
                        color: "secondary.main",
                        fontSize: 12,
                        fontWeight: 900,
                      }}
                    >
                      Etapa actual
                    </Box>
                  ) : null}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {step.description}
                </Typography>
              </Box>
            </Stack>
          );
        })}
      </Stack>
    </Paper>
  );
};

export default ProductionTrace;
