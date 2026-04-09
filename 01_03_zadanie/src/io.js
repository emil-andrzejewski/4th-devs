export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

export const parseJsonBody = async (req, { maxBytes }) => {
  let totalBytes = 0;
  const chunks = [];

  for await (const chunk of req) {
    totalBytes += chunk.length;

    if (totalBytes > maxBytes) {
      throw new HttpError(413, "Request body too large");
    }

    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    throw new HttpError(400, "Request body is required");
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new HttpError(400, "Invalid JSON payload");
  }
};

export const sendJson = (res, status, data) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(`${JSON.stringify(data)}\n`);
};
