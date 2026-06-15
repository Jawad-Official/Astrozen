const { execFileSync, spawn } = require("node:child_process");
const path = require("node:path");

const command = process.argv[2];
const args = process.argv.slice(3);

const bins = {
  vite: path.join("node_modules", "vite", "bin", "vite.js"),
  vitest: path.join("node_modules", "vitest", "vitest.mjs"),
};

if (!command || !bins[command]) {
  console.error("Usage: node scripts/run-on-subst.cjs <vite|vitest> [...args]");
  process.exit(1);
}

const run = (file, fileArgs, options = {}) => {
  return spawn(file, fileArgs, { stdio: "inherit", shell: false, ...options });
};

if (process.platform !== "win32") {
  const child = run(process.execPath, [path.resolve(process.cwd(), bins[command]), ...args], {
    cwd: process.cwd(),
  });
  child.on("exit", (code) => process.exit(code ?? 1));
  return;
}

const cwd = process.cwd();
const drive = ["Z:", "Y:", "X:", "W:"].find((candidate) => {
  try {
    execFileSync("subst", [candidate, cwd], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
});

if (!drive) {
  console.error("Could not create a temporary drive mapping for the frontend folder.");
  process.exit(1);
}

const mappedRoot = `${drive}\\`;
const cleanup = () => {
  try {
    execFileSync("subst", [drive, "/D"], { stdio: "ignore" });
  } catch {
    // The mapping may already be gone if the process was interrupted.
  }
};

const child = run(process.execPath, [path.join(mappedRoot, bins[command]), ...args], {
  cwd: mappedRoot,
});

process.on("SIGINT", () => {
  child.kill("SIGINT");
});

process.on("SIGTERM", () => {
  child.kill("SIGTERM");
});

child.on("exit", (code) => {
  cleanup();
  process.exit(code ?? 1);
});
