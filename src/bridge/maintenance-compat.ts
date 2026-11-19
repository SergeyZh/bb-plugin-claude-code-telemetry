// Backported from get-bb/bb at d9bcc98cac2b924e4c667e435d721a602e63e4c4.
// Keep SDK 0.6.104 standalone compatibility until these helpers are published.
import {
  experimental_hostToolchain as hostToolchain,
  experimental_execHostFile as execHostFile,
} from "@get-bb/plugin-sdk/process";
import {
  experimental_versionFrom as versionFrom,
  experimental_npmCommand as npmCommand,
} from "@get-bb/plugin-sdk/provider-bridge";
import path from "node:path";
import { z } from "zod";
const CLI_PROBE_TIMEOUT_MS = 5_000;
const INSTALLATION_CHECK_TIMEOUT_MS = 15_000;

export async function resolveExecutablePath(
  command: string,
  env?: NodeJS.ProcessEnv,
): Promise<string | null> {
  return hostToolchain.resolve(command, env === undefined ? {} : { env });
}

export async function commandOutput(
  command: string,
  args: readonly string[],
  env?: NodeJS.ProcessEnv,
): Promise<string | null> {
  try {
    const { stdout, stderr } = await execHostFile(command, [...args], {
      cwd: process.cwd(),
      env: env ?? process.env,
      maxBuffer: 1024 * 1024,
      timeout: INSTALLATION_CHECK_TIMEOUT_MS,
    });
    return `${stdout}\n${stderr}`.trim();
  } catch {
    return null;
  }
}

export async function readCliVersion(
  command: string,
  env?: NodeJS.ProcessEnv,
): Promise<string | null> {
  try {
    const { stdout, stderr } = await execHostFile(command, ["--version"], {
      cwd: process.cwd(),
      env: env ?? process.env,
      maxBuffer: 1024 * 1024,
      timeout: CLI_PROBE_TIMEOUT_MS,
    });
    return versionFrom(`${stdout}\n${stderr}`);
  } catch {
    return null;
  }
}

export interface NpmGlobalPackageProbe {
  npmBin: string | null;
  npmGlobalPackageVersion: string | null;
}

export async function probeNpmGlobalPackage(
  npmPackage: string,
  env?: NodeJS.ProcessEnv,
): Promise<NpmGlobalPackageProbe> {
  const npm = npmCommand();
  const [prefixOutput, listOutput] = await Promise.all([
    commandOutput(npm, ["prefix", "-g"], env),
    commandOutput(npm, ["list", "-g", npmPackage, "--depth=0", "--json"], env),
  ]);
  const npmPrefix = firstLine(prefixOutput);
  return {
    npmBin:
      npmPrefix === null
        ? null
        : process.platform === "win32"
          ? npmPrefix
          : path.join(npmPrefix, "bin"),
    npmGlobalPackageVersion: npmGlobalPackageVersion(listOutput, npmPackage),
  };
}

function firstLine(value: string | null): string | null {
  return (
    value
      ?.split(/\r?\n/u)
      .map((line) => line.trim())
      .find(Boolean) ?? null
  );
}

function npmGlobalPackageVersion(
  value: string | null,
  npmPackage: string,
): string | null {
  if (value === null) return null;
  try {
    const parsed = z
      .object({
        dependencies: z
          .record(z.string(), z.object({ version: z.string().min(1) }))
          .default({}),
      })
      .safeParse(JSON.parse(value));
    return parsed.success
      ? (parsed.data.dependencies[npmPackage]?.version ?? null)
      : null;
  } catch {
    return null;
  }
}
