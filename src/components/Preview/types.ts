export interface FileRequest {
  type: "file-request";
  path: string;
}

export interface FileResponse {
  type: "file-response";
  path: string;
  content?: Uint8Array<ArrayBuffer>;
  error?: any;
}
