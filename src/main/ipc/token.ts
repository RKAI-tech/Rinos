import { ipcMain } from "electron";
import Store from "electron-store";

export function registerTokenIpc() {
  const store = new Store<{ access_token?: string }>();

  ipcMain.handle("token:get", () => {
    return store.get("access_token") || null;
  });

  ipcMain.handle("token:set", (_evt, token: string | null) => {
    if (token) store.set("access_token", token);
    else store.delete("access_token");
    return true;
  });

  ipcMain.handle("token:remove", () => {
    store.delete("access_token");
    return true;
  });
}


