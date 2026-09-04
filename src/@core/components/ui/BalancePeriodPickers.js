import { useEffect, useState } from "react";
import { Box, Button, Grid, IconButton, Popover, Stack, TextField, Typography } from "@mui/material";
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import {
  getIsoWeekInputValue,
  getWeekRange,
  parseInputDate,
  toDateInputValue,
  toMonthInputValue,
} from "./balance-date-utils";

const monthFormatter = new Intl.DateTimeFormat("es-CO", { month: "long" });

const pickerFieldSx = {
  minWidth: { sm: 170 },
  cursor: "pointer",
  "& .MuiOutlinedInput-root": {
    borderRadius: 2.5,
    bgcolor: "background.paper",
    "& input": {
      cursor: "pointer",
      fontWeight: 700,
    },
  },
};

const popoverPaperSx = {
  mt: 1,
  borderRadius: 3,
  border: "1px solid rgba(148, 163, 184, 0.28)",
  boxShadow: "0 20px 55px rgba(15, 23, 42, 0.18)",
  p: 2,
};

const formatDisplayDate = (value) => {
  if (!value) {
    return "";
  }

  const [year, month, day] = String(value).split("-");
  return `${day}/${month}/${year}`;
};

const getMonthLabel = (date) => `${monthFormatter.format(date)} de ${date.getFullYear()}`;

const getMonthValueLabel = (value) => {
  const [year, month] = String(value || toMonthInputValue()).split("-").map(Number);
  return getMonthLabel(new Date(year, month - 1, 1));
};

const getWeekValueLabel = (value) => {
  const [yearText, weekText] = String(value || getIsoWeekInputValue()).split("-W");
  return `Semana ${Number(weekText)}, ${yearText}`;
};

const getCalendarDays = (viewDate) => {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days = [];

  for (let index = firstDay.getDay(); index > 0; index -= 1) {
    days.push({ date: new Date(year, month, 1 - index), currentMonth: false });
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    days.push({ date: new Date(year, month, day), currentMonth: true });
  }

  while (days.length % 7 !== 0 || days.length < 42) {
    const lastDate = days[days.length - 1].date;
    days.push({ date: new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate() + 1), currentMonth: false });
  }

  return days;
};

const getCalendarWeeks = (viewDate) => {
  const days = getCalendarDays(viewDate);
  const weeks = [];

  for (let index = 0; index < days.length; index += 7) {
    const weekDays = days.slice(index, index + 7);
    const weekValue = getIsoWeekInputValue(weekDays[1]?.date || weekDays[0].date);
    weeks.push({
      days: weekDays,
      value: weekValue,
      label: Number(weekValue.split("-W")[1]),
    });
  }

  return weeks;
};

export const BalanceDatePicker = ({ label, value, onChange, minDate, fullWidth = false, error = false, helperText }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [viewDate, setViewDate] = useState(parseInputDate(value));
  const today = toDateInputValue();
  const open = Boolean(anchorEl);
  const minDateValue = minDate ? String(minDate).slice(0, 10) : null;

  useEffect(() => {
    setViewDate(parseInputDate(value));
  }, [value]);

  const handleSelectDate = (date) => {
    const nextValue = toDateInputValue(date);
    if (minDateValue && nextValue < minDateValue) {
      return;
    }

    onChange(nextValue);
    setAnchorEl(null);
  };

  const shiftMonth = (amount) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  return (
    <>
      <TextField
        size="small"
        label={label}
        value={formatDisplayDate(value)}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        InputLabelProps={{ shrink: true }}
        InputProps={{
          readOnly: true,
          endAdornment: <CalendarTodayRoundedIcon fontSize="small" color="action" />,
        }}
        fullWidth={fullWidth}
        error={error}
        helperText={helperText}
        sx={pickerFieldSx}
      />
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{ sx: { ...popoverPaperSx, width: 310 } }}
      >
        <Stack spacing={1.5}>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Typography sx={{ fontWeight: 900, textTransform: "capitalize" }}>{getMonthLabel(viewDate)}</Typography>
            <Stack direction="row" spacing={0.5}>
              <IconButton size="small" onClick={() => shiftMonth(-1)}>
                <ChevronLeftRoundedIcon />
              </IconButton>
              <IconButton size="small" onClick={() => shiftMonth(1)}>
                <ChevronRightRoundedIcon />
              </IconButton>
            </Stack>
          </Stack>

          <Grid container columns={7} spacing={0.5}>
            {["do.", "lu.", "ma.", "mi.", "ju.", "vi.", "sa."].map((day) => (
              <Grid item xs={1} key={day}>
                <Typography variant="caption" sx={{ display: "block", textAlign: "center", color: "text.secondary", fontWeight: 800 }}>
                  {day}
                </Typography>
              </Grid>
            ))}
            {getCalendarDays(viewDate).map((item) => {
              const dateValue = toDateInputValue(item.date);
              const isSelected = dateValue === value;
              const isToday = dateValue === today;
              const isDisabled = minDateValue && dateValue < minDateValue;

              return (
                <Grid item xs={1} key={dateValue}>
                  <Button
                    onClick={() => handleSelectDate(item.date)}
                    disabled={isDisabled}
                    variant={isSelected ? "contained" : "text"}
                    color={isSelected ? "secondary" : "primary"}
                    sx={{
                      minWidth: 0,
                      width: 34,
                      height: 34,
                      borderRadius: 2,
                      p: 0,
                      mx: "auto",
                      color: isSelected ? "common.white" : isDisabled || !item.currentMonth ? "text.disabled" : "text.primary",
                      border: isToday && !isSelected ? "1px solid" : "1px solid transparent",
                      borderColor: isToday && !isSelected ? "secondary.main" : "transparent",
                      fontWeight: isSelected || isToday ? 900 : 700,
                      opacity: isDisabled ? 0.45 : 1,
                      "&:hover": {
                        bgcolor: isSelected ? "secondary.dark" : "rgba(234, 88, 12, 0.10)",
                      },
                    }}
                  >
                    {item.date.getDate()}
                  </Button>
                </Grid>
              );
            })}
          </Grid>

          <Stack direction="row" sx={{ justifyContent: "space-between", pt: 0.5 }}>
            <Button size="small" color="inherit" onClick={() => setAnchorEl(null)}>
              Cerrar
            </Button>
            <Button size="small" color="secondary" disabled={Boolean(minDateValue && today < minDateValue)} onClick={() => handleSelectDate(new Date())}>
              Hoy
            </Button>
          </Stack>
        </Stack>
      </Popover>
    </>
  );
};

export const BalanceWeekPicker = ({ label, value, onChange }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [viewDate, setViewDate] = useState(() => parseInputDate(getWeekRange(value).from));
  const open = Boolean(anchorEl);

  useEffect(() => {
    setViewDate(parseInputDate(getWeekRange(value).from));
  }, [value]);

  const shiftMonth = (amount) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  const handleSelectWeek = (weekValue) => {
    onChange(weekValue);
    setAnchorEl(null);
  };

  return (
    <>
      <TextField
        size="small"
        label={label}
        value={getWeekValueLabel(value)}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        InputLabelProps={{ shrink: true }}
        InputProps={{
          readOnly: true,
          endAdornment: <CalendarTodayRoundedIcon fontSize="small" color="action" />,
        }}
        sx={{ ...pickerFieldSx, minWidth: { sm: 180 } }}
      />
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{ sx: { ...popoverPaperSx, width: 360 } }}
      >
        <Stack spacing={1.25}>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Typography sx={{ fontWeight: 900, textTransform: "capitalize" }}>{getMonthLabel(viewDate)}</Typography>
            <Stack direction="row" spacing={0.5}>
              <IconButton size="small" onClick={() => shiftMonth(-1)}>
                <ChevronLeftRoundedIcon />
              </IconButton>
              <IconButton size="small" onClick={() => shiftMonth(1)}>
                <ChevronRightRoundedIcon />
              </IconButton>
            </Stack>
          </Stack>

          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 0.5 }}>
            {["Sem.", "do.", "lu.", "ma.", "mi.", "ju.", "vi.", "sa."].map((day) => (
              <Box key={day}>
                <Typography variant="caption" sx={{ display: "block", textAlign: "center", color: "text.secondary", fontWeight: 800 }}>
                  {day}
                </Typography>
              </Box>
            ))}
            {getCalendarWeeks(viewDate).map((week) => {
              const isSelected = week.value === value;

              return (
                <Box
                  key={week.value}
                  component="button"
                  type="button"
                  onClick={() => handleSelectWeek(week.value)}
                  sx={{
                    gridColumn: "1 / -1",
                    display: "grid",
                    gridTemplateColumns: "repeat(8, 1fr)",
                    gap: 0.5,
                    p: 0,
                    border: 0,
                    bgcolor: "transparent",
                    cursor: "pointer",
                    font: "inherit",
                    "&:hover .week-cell": {
                      bgcolor: isSelected ? "secondary.main" : "rgba(234, 88, 12, 0.10)",
                    },
                  }}
                >
                  <Box
                    className="week-cell"
                    sx={{
                      height: 34,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 2,
                      color: isSelected ? "common.white" : "secondary.main",
                      bgcolor: isSelected ? "secondary.main" : "transparent",
                      fontWeight: 900,
                    }}
                  >
                    {week.label}
                  </Box>
                  {week.days.map((item) => (
                    <Box
                      className="week-cell"
                      key={toDateInputValue(item.date)}
                      sx={{
                        height: 34,
                        display: "grid",
                        placeItems: "center",
                        borderRadius: 2,
                        color: isSelected ? "common.white" : item.currentMonth ? "text.primary" : "text.disabled",
                        bgcolor: isSelected ? "secondary.main" : "transparent",
                        fontWeight: isSelected ? 900 : 700,
                      }}
                    >
                      {item.date.getDate()}
                    </Box>
                  ))}
                </Box>
              );
            })}
          </Box>

          <Stack direction="row" sx={{ justifyContent: "space-between", pt: 0.5 }}>
            <Button size="small" color="inherit" onClick={() => setAnchorEl(null)}>
              Cerrar
            </Button>
            <Button size="small" color="secondary" onClick={() => handleSelectWeek(getIsoWeekInputValue())}>
              Esta semana
            </Button>
          </Stack>
        </Stack>
      </Popover>
    </>
  );
};

export const BalanceMonthPicker = ({ label, value, onChange, todayLabel = "Este mes", fullWidth = false }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [viewYear, setViewYear] = useState(() => Number(String(value || toMonthInputValue()).split("-")[0]));
  const open = Boolean(anchorEl);
  const selectedMonth = String(value || toMonthInputValue());
  const currentMonth = toMonthInputValue();
  const monthLabels = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sep.", "oct.", "nov.", "dic."];

  useEffect(() => {
    setViewYear(Number(String(value || toMonthInputValue()).split("-")[0]));
  }, [value]);

  const handleSelectMonth = (monthIndex) => {
    onChange(`${viewYear}-${String(monthIndex + 1).padStart(2, "0")}`);
    setAnchorEl(null);
  };

  const handleSelectCurrentMonth = () => {
    onChange(currentMonth);
    setAnchorEl(null);
  };

  return (
    <>
      <TextField
        size="small"
        fullWidth={fullWidth}
        label={label}
        value={getMonthValueLabel(value)}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        InputLabelProps={{ shrink: true }}
        InputProps={{
          readOnly: true,
          endAdornment: <CalendarTodayRoundedIcon fontSize="small" color="action" />,
        }}
        sx={{
          ...pickerFieldSx,
          "& .MuiOutlinedInput-root input": {
            cursor: "pointer",
            fontWeight: 700,
            textTransform: "capitalize",
          },
        }}
      />
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{ sx: { ...popoverPaperSx, width: 304 } }}
      >
        <Stack spacing={1.5}>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <IconButton size="small" onClick={() => setViewYear((year) => year - 1)}>
              <ChevronLeftRoundedIcon />
            </IconButton>
            <Typography sx={{ fontWeight: 900 }}>{viewYear}</Typography>
            <IconButton size="small" onClick={() => setViewYear((year) => year + 1)}>
              <ChevronRightRoundedIcon />
            </IconButton>
          </Stack>

          <Grid container spacing={1}>
            {monthLabels.map((month, index) => {
              const monthValue = `${viewYear}-${String(index + 1).padStart(2, "0")}`;
              const isSelected = monthValue === selectedMonth;
              const isCurrent = monthValue === currentMonth;

              return (
                <Grid item xs={3} key={month}>
                  <Button
                    onClick={() => handleSelectMonth(index)}
                    variant={isSelected ? "contained" : "text"}
                    color={isSelected ? "secondary" : "primary"}
                    sx={{
                      minWidth: 0,
                      width: "100%",
                      height: 42,
                      borderRadius: 2,
                      color: isSelected ? "common.white" : "text.primary",
                      border: isCurrent && !isSelected ? "1px solid" : "1px solid transparent",
                      borderColor: isCurrent && !isSelected ? "secondary.main" : "transparent",
                      fontWeight: isSelected || isCurrent ? 900 : 700,
                      "&:hover": {
                        bgcolor: isSelected ? "secondary.dark" : "rgba(234, 88, 12, 0.10)",
                      },
                    }}
                  >
                    {month}
                  </Button>
                </Grid>
              );
            })}
          </Grid>

          <Stack direction="row" sx={{ justifyContent: "space-between", pt: 0.5 }}>
            <Button size="small" color="inherit" onClick={() => setAnchorEl(null)}>
              Cerrar
            </Button>
            <Button size="small" color="secondary" onClick={handleSelectCurrentMonth}>
              {todayLabel}
            </Button>
          </Stack>
        </Stack>
      </Popover>
    </>
  );
};
