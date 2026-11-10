import { definePluginApp } from "@get-bb/plugin-sdk/app";
import { mountPromptCacheTooltips } from "./src/prompt-cache-tooltips.js";

export default definePluginApp((app) => {
  app.contentScripts.register({
    id: "prompt-cache-tooltips",
    mount: ({ signal }) => mountPromptCacheTooltips(signal),
  });
});
