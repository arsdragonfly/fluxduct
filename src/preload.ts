import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("fluxduct", {
  hello: (name: string) => ipcRenderer.invoke("fluxduct:hello", name),
  init: () => ipcRenderer.invoke("fluxduct:init"),
  onEvent: (callback: (event: string, payload: unknown) => void) => {
    ipcRenderer.on('pipewire-event', (_event, data) => callback(data.event, data.payload));
  }
});
