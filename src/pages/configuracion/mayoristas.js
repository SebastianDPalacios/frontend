import { useEffect, useState } from "react";
import { Alert, Stack } from "@mui/material";
import { useRouter } from "next/router";
import FlowPageLayout from "views/modules/FlowPageLayout";
import WholesaleConfigurationPanel from "components/organisms/wholesale/WholesaleConfigurationPanel";
import WholesaleDuplicateAuditPanel from "components/organisms/wholesale/WholesaleDuplicateAuditPanel";
import authService from "services/auth/auth-service";
import { isAdministrativeUser } from "configs/access";

const WholesaleConfigurationPage = () => {
  const router = useRouter();
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    const isAllowed = isAdministrativeUser(authService.getCurrentUser());
    setAllowed(isAllowed);
    if (!isAllowed) router.replace("/dashboards/analytics");
  }, [router]);

  return <FlowPageLayout title="Configuración de Mayoristas" subtitle="Administra clientes, listas de precios y excepciones comerciales sin duplicar inventarios.">
    {allowed === true ? <Stack spacing={3}><WholesaleConfigurationPanel /><WholesaleDuplicateAuditPanel /></Stack> : <Alert severity="info">Validando acceso administrativo...</Alert>}
  </FlowPageLayout>;
};

export default WholesaleConfigurationPage;
