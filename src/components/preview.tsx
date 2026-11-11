import { useEffect, useState } from "react";

export default function Preview(props: { entryPath: string }) {
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);

  useEffect(() => {
    const awaitServiceWorkerReady = async () => {
      await navigator.serviceWorker.ready;
      setServiceWorkerReady(true);
    };

    awaitServiceWorkerReady();
  }, []);

  return (
    <>
      {serviceWorkerReady ? (
        <iframe
          title={"Preview: " + props.entryPath}
          src={props.entryPath}
          frameBorder="0"
          width="100%"
          height="100%"
        ></iframe>
      ) : (
        <>Waiting until service worker is active</>
      )}
    </>
  );
}

export interface FileRequest {
  type: "file-request";
  path: string;
}

export interface FileResponse {
  type: "file-response";
  path: string;
  content?: Uint8Array<ArrayBuffer> | string;
  error?: any;
}
