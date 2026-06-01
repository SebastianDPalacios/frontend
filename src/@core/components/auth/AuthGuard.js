import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import authService from "services/auth/auth-service";

const AuthGuard = ({ children }) => {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let sessionTimer;

    const isAuth = authService.isAuthenticated();
    if (!isAuth) {
      router.replace("/login");
      setAuthorized(false);
      setChecked(true);
      return;
    }

    const currentUser = authService.getCurrentUser();
    const mustChangePassword = Number(currentUser?.must_change_password) === 1;

    if (mustChangePassword && router.pathname !== "/change-password") {
      router.replace("/change-password");
      setAuthorized(false);
      setChecked(true);
      return;
    }

    if (!mustChangePassword && router.pathname === "/change-password") {
      router.replace("/dashboards/analytics");
      setAuthorized(false);
      setChecked(true);
      return;
    }

    setAuthorized(isAuth);
    setChecked(true);

    const checkSession = () => {
      authService.checkSession().catch(() => {
        // El interceptor global maneja el 401 limpiando la sesion y redirigiendo al login.
      });
    };

    checkSession();
    sessionTimer = window.setInterval(checkSession, 15000);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkSession();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (sessionTimer) {
        window.clearInterval(sessionTimer);
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [router]);

  if (!checked || !authorized) {
    return null;
  }

  return children;
};

export default AuthGuard;
