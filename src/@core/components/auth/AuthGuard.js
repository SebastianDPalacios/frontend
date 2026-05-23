import { useRouter } from "next/router";
import { useEffect } from "react";
import authService from "services/auth/auth-service";

const AuthGuard = ({ children }) => {
  const router = useRouter();

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.replace("/login");
    }
  }, [router]);

  if (!authService.isAuthenticated()) {
    return null;
  }

  return children;
};

export default AuthGuard;
