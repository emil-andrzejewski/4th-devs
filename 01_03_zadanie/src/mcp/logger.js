export const mcpLog = (event, details = {}) => {
  const ts = new Date().toISOString();
  console.log(`[packages-mcp] ${ts} ${event} ${JSON.stringify(details)}`);
};
