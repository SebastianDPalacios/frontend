import { useEffect, useState } from "react";
import authService from "services/auth/auth-service";

const useAuth = () => {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    setAuthenticated(authService.isAuthenticated());
  }, []);

  return { authenticated };
};

export default useAuth;
