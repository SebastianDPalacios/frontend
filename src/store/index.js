import { configureStore } from "@reduxjs/toolkit";
import user from "store/apps/user";

export const store = configureStore({
  reducer: {
    user,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});
