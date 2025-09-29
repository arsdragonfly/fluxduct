import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("fluxduct", {
  hello: (name: string) => ipcRenderer.invoke("fluxduct:hello", name),
});