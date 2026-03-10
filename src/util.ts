export async function copyText(text: string) {
  const legacyCopy = (text: string) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed"; // Prevent scrolling to bottom
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  };

  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      legacyCopy(text);
    }
  } else {
    legacyCopy(text);
  }
}

export function downloadFile(content: Blob, filename: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(content);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => {
    URL.revokeObjectURL(link.href);
  }, 5000);
}

export async function importFiles(options?: {
  multiple: boolean;
}): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    if (options && options.multiple === true) {
      input.multiple = true;
    }
    input.style.display = "none";
    input.onchange = () => {
      const files = Array.from(input.files!);
      resolve(files);
      document.body.removeChild(input);
    };
    document.body.appendChild(input);
    input.click();
  });
}

export async function exportFile(blob: Blob, name: string) {
  if (window.webxdc) {
    await window.webxdc.sendToChat({
      file: {
        blob,
        name,
      },
    });
  } else {
    downloadFile(blob, name);
  }
}
