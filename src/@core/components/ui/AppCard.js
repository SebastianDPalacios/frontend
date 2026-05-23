import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";

const AppCard = ({ children, contentSx, ...props }) => {
  return (
    <Card {...props}>
      <CardContent sx={{ p: { xs: 2, sm: 3 }, ...contentSx }}>{children}</CardContent>
    </Card>
  );
};

export default AppCard;
