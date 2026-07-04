import { useEffect } from "react";
import { useRouter } from "next/router";
import authService from "services/auth/auth-service";
import { getHomePathForUser } from "configs/access";

const Home = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace(getHomePathForUser(authService.getCurrentUser()));
  }, [router]);

  return null;
};

export default Home;
