export const extractResponseText = (data) => {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }

  const messages = Array.isArray(data?.output)
    ? data.output.filter((item) => item?.type === "message")
    : [];

  const textPart = messages
    .flatMap((message) => (Array.isArray(message?.content) ? message.content : []))
    .find((part) => part?.type === "output_text" && typeof part?.text === "string");

  return textPart?.text ?? "";
};

export const extractAllResponseTexts = (data) => {
  const directText = typeof data?.output_text === "string" && data.output_text.trim()
    ? [data.output_text.trim()]
    : [];

  const messageItems = Array.isArray(data?.output)
    ? data.output.filter((item) => item?.type === "message")
    : [];

  const nestedTexts = messageItems
    .flatMap((message) => (Array.isArray(message?.content) ? message.content : []))
    .filter((part) => (
      (part?.type === "output_text" || part?.type === "text")
      && typeof part?.text === "string"
      && part.text.trim()
    ))
    .map((part) => part.text.trim());

  return [...new Set([...directText, ...nestedTexts])];
};

export const extractReasoningInfo = (data) => {
  const reasoningItems = Array.isArray(data?.output)
    ? data.output.filter((item) => item?.type === "reasoning")
    : [];

  const summary = reasoningItems
    .flatMap((item) => (Array.isArray(item?.summary) ? item.summary : []))
    .map((entry) => {
      if (typeof entry === "string") return entry.trim();
      if (typeof entry?.text === "string") return entry.text.trim();
      return "";
    })
    .filter(Boolean);

  const encryptedCount = reasoningItems.filter((item) => typeof item?.encrypted_content === "string").length;

  return {
    reasoningCount: reasoningItems.length,
    encryptedCount,
    summary
  };
};
