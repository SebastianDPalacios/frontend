import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import authService from "services/auth/auth-service";

const AuthGuard = ({ children }) => {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const isAuth = authService.isAuthenticated();
    if (!isAuth) {
      router.replace("/login");
    }
    setAuthorized(isAuth);
    setChecked(true);
  }, [router]);

  if (!checked || !authorized) {
    return null;
  }

  return children;
};

export default AuthGuard;
