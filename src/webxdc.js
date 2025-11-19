/**
 * $$device$$ will be replaced using string.replaceAll()
 */
window.webxdc = (() => {
  const parentWebxdc = window.parent.webxdc;
  //@ts-ignore
  const updates = window.parent.fakeWebxdcUpdates;
  //@ts-ignore
  const updateListeners = window.parent.fakeWebxdcUpdateListeners;
  //@ts-ignore
  const realtimeListeners = window.parent.fakeWebxdcRealtimeListeners;

  //@ts-ignore
  let realtimeChannel = null;

  class RealtimeChannel {
    constructor() {
      /** @private */
      this.trashed = false;
    }

    /**
     *
     * @param {Function} listener
     */
    setListener(listener) {
      if (this.trashed) return;
      realtimeListeners["$$device$$"] = listener;
    }

    /**
     *
     * @param {Uint8Array} data
     */
    send(data) {
      if (this.trashed) return;

      if (!(data instanceof Uint8Array)) {
        throw new Error("realtime listener data must be a Uint8Array");
      }

      Object.entries(realtimeListeners).forEach(([device, listener]) => {
        if (device !== "$$device$$") {
          listener(data);
        }
      });
    }

    leave() {
      this.trashed = true;
      realtimeListeners["$$device$$"] = null;
      realtimeChannel = null;
    }
  }

  return {
    sendUpdateInterval: parentWebxdc.sendUpdateInterval,
    sendUpdateMaxSize: parentWebxdc.sendUpdateMaxSize,
    importFiles: parentWebxdc.importFiles,
    sendToChat: parentWebxdc.sendToChat,
    selfName: "$$device$$",
    selfAddr: "$$device$$@local.host",
    getAllUpdates: () => {
      console.log("[Webxdc] WARNING: getAllUpdates() is deprecated.");
      return Promise.resolve([]);
    },
    sendUpdate: (update) => {
      const serial = updates.length + 1;
      const _update = {
        payload: update.payload,
        summary: update.summary,
        info: update.info,
        notify: update.notify,
        href: update.href,
        document: update.document,
        serial: serial,
        max_serial: serial,
      };
      updates.push(_update);
      //@ts-ignore
      Object.values(updateListeners).forEach((listener) => listener(_update));
    },
    setUpdateListener: (cb, serial = 0) => {
      const maxSerial = updates.length;
      //@ts-ignore
      updates.forEach((update) => {
        if (update.serial > serial) {
          update.max_serial = maxSerial;
          cb(update);
        }
      });
      updateListeners["$$device$$"] = cb;
      return Promise.resolve();
    },
    joinRealtimeChannel: () => {
      //@ts-ignore
      if (realtimeChannel) {
        throw new Error(
          "leave previos realtime channel before joining a new one."
        );
      }
      realtimeChannel = new RealtimeChannel();
      return realtimeChannel;
    },
  };
})();
