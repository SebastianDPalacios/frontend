import Head from "next/head";
import { Router } from "next/router";
import { Provider } from "react-redux";
import NProgress from "nprogress";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

import { store } from "store";
import themeConfig from "configs/themeConfig";
import UserLayout from "layouts/UserLayout";
import AuthGuard from "@core/components/auth/AuthGuard";
import theme from "@core/theme";

import "../../styles/globals.css";

if (themeConfig.routingLoader) {
  Router.events.on("routeChangeStart", () => NProgress.start());
  Router.events.on("routeChangeError", () => NProgress.done());
  Router.events.on("routeChangeComplete", () => NProgress.done());
}

const App = ({ Component, pageProps }) => {
  const getLayout = Component.getLayout || ((page) => <UserLayout>{page}</UserLayout>);
  const authGuard = Component.authGuard ?? true;

  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Head>
          <title>{themeConfig.templateName}</title>
          <meta name="viewport" content="initial-scale=1, width=device-width" />
        </Head>
        {authGuard ? <AuthGuard>{getLayout(<Component {...pageProps} />)}</AuthGuard> : getLayout(<Component {...pageProps} />)}
        <Toaster position="top-right" />
      </ThemeProvider>
    </Provider>
  );
};

export default App;
