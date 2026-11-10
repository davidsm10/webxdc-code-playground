export async function persistStorage() {
  if (navigator.storage && navigator.storage.persist) {
    try {
      const persisted = await navigator.storage.persist();
      if (persisted) {
        console.log("Storage persisted");
      } else {
        console.log("Storage no persisted");
      }
    } catch (err) {
      console.log("Error persisting storage:", err);
    }
  } else {
    console.log("Persistent storage not available");
  }
}
