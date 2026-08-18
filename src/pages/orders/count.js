import { Box, useMediaQuery } from "@mui/material";
import AtomicOrderForm from "components/organisms/orders/AtomicOrderForm";
import { isSalesOnlyUser } from "configs/access";
import authService from "services/auth/auth-service";
import FlowPageLayout from "views/modules/FlowPageLayout";

const OrdersCountPage = () => {
  const compactSellerView = useMediaQuery("(max-width:1024px)", { noSsr: true })
    && isSalesOnlyUser(authService.getCurrentUser());

  if (compactSellerView) {
    return <Box sx={{ mx: { xs: -1, sm: 0 } }}><AtomicOrderForm /></Box>;
  }

  return (
    <FlowPageLayout
      title="Nuevo pedido"
      subtitle="Captura productos por valor o cantidad para tus clientes asignados"
    >
      <AtomicOrderForm />
    </FlowPageLayout>
  );
};

export default OrdersCountPage;
