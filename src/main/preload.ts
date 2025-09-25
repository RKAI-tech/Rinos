import { exposeAPIs } from "./preload/api";
import { exposeMicrosoftAPI } from "./preload/microsoft";
import { exposeTokenAPI } from "./preload/token";
import { exposeScreenHandleAPI } from "./preload/screen_handle";
import { exposeBrowserAPI } from "./preload/browser";
// Expose tất cả APIs
exposeAPIs();
exposeMicrosoftAPI();
exposeTokenAPI();
exposeScreenHandleAPI();
exposeBrowserAPI();


