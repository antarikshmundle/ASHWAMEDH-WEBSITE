/**
 * Browser upload to a signed staging URL (Phase 10.4; shared with the gallery in 10.6).
 */
/** PUT to the signed staging URL with upload progress. The URL is never logged or shown. */
export function sendFile(
  url: string,
  file: File,
  type: string,
  onProgress: (percent: number) => void,
) {
  return new Promise<boolean>((resolve) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.setRequestHeader("content-type", type);
    request.timeout = 10 * 60 * 1000;
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => resolve(request.status >= 200 && request.status < 300);
    request.onerror = request.onabort = request.ontimeout = () => resolve(false);
    request.send(file);
  });
}
