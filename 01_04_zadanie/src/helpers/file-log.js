import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { inspect } from "node:util";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "../..");

const toLogString = (value) => {
  if (typeof value === "string") return value;
  return inspect(value, { depth: 6, colors: false, breakLength: 160 });
};

const formatArgs = (args) => args.map(toLogString).join(" ");

export const enableFileLogging = async (subdir = "workspace/logs") => {
  const logsDir = join(PROJECT_ROOT, subdir);
  await mkdir(logsDir, { recursive: true });

  const timestamp = new Date().toISOString().replaceAll(":", "-");
  const filename = `run-${timestamp}.txt`;
  const absolutePath = join(logsDir, filename);
  const relativePath = relative(PROJECT_ROOT, absolutePath).replaceAll("\\", "/");
  const stream = createWriteStream(absolutePath, { flags: "a", encoding: "utf8" });

  const original = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console)
  };

  const write = (level, args) => {
    const line = `[${new Date().toISOString()}] [${level}] ${formatArgs(args)}\n`;
    stream.write(line);
  };

  console.log = (...args) => {
    original.log(...args);
    write("LOG", args);
  };

  console.info = (...args) => {
    original.info(...args);
    write("INFO", args);
  };

  console.warn = (...args) => {
    original.warn(...args);
    write("WARN", args);
  };

  console.error = (...args) => {
    original.error(...args);
    write("ERROR", args);
  };

  const close = async () => {
    console.log = original.log;
    console.info = original.info;
    console.warn = original.warn;
    console.error = original.error;

    await new Promise((resolve, reject) => {
      stream.end((error) => (error ? reject(error) : resolve()));
    });
  };

  return {
    absolutePath,
    relativePath,
    close
  };
};

