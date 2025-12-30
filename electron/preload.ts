import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electron',
  {
    ipcRenderer: {
      invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
      on: (channel: string, func: (...args: unknown[]) => void) => {
        const subscription = (_event: unknown, ...args: unknown[]) => func(...args);
        ipcRenderer.on(channel, subscription);
        return () => ipcRenderer.removeListener(channel, subscription);
      }
    }
  }
);
