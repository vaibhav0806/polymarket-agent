import * as p from "@clack/prompts";
import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const ROOT = process.cwd();
const isCheck = process.argv.includes("--check");

// ── Helpers ───────────────────────────────────────────────

function exec(cmd: string): { ok: boolean; stdout: string } {
  try {
    const stdout = execSync(cmd, {
      cwd: ROOT,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return { ok: true, stdout };
  } catch (e: unknown) {
    const err = e as { stdout?: Buffer | string };
    return { ok: false, stdout: (err.stdout ?? "").toString().trim() };
  }
}

function hasBin(name: string): boolean {
  return exec(`which ${name}`).ok;
}

function parseEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const env: Record<string, string> = {};
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    )
      val = val.slice(1, -1);
    if (val) env[key] = val;
  }
  return env;
}

function cancel(): never {
  p.cancel("Setup cancelled.");
  process.exit(0);
}

function mask(key: string): string {
  if (key.length <= 10) return "***";
  return key.slice(0, 7) + "..." + key.slice(-4);
}

// ── Check mode ────────────────────────────────────────────

async function checkMode() {
  p.intro("NBA Polymarket Agent — Health Check");

  let passed = 0;
  let total = 0;

  // Node
  total++;
  const nodeMajor = parseInt(process.version.slice(1));
  if (nodeMajor >= 18) {
    p.log.success(`Node.js ${process.version}`);
    passed++;
  } else {
    p.log.error(`Node.js ${process.version} — need 18+`);
  }

  // Polymarket CLI
  total++;
  if (hasBin("polymarket")) {
    p.log.success("Polymarket CLI installed");
    passed++;
  } else {
    p.log.error("Polymarket CLI not found");
  }

  // Wallet
  total++;
  const wallet = exec("polymarket wallet address");
  if (wallet.ok && wallet.stdout) {
    p.log.success(`Wallet: ${wallet.stdout}`);
    passed++;
  } else {
    p.log.error("Wallet not configured");
  }

  // .env
  total++;
  const env = parseEnvFile(join(ROOT, ".env"));
  if (env.OPENAI_API_KEY) {
    p.log.success(`OpenAI API key: ${mask(env.OPENAI_API_KEY)}`);
    passed++;
  } else {
    p.log.error("OpenAI API key missing from .env");
  }

  // Database
  total++;
  if (existsSync(join(ROOT, "dev.db"))) {
    p.log.success("Database exists");
    passed++;
  } else {
    p.log.error("Database not initialized");
  }

  // Prisma client
  total++;
  if (existsSync(join(ROOT, "src", "generated", "prisma"))) {
    p.log.success("Prisma client generated");
    passed++;
  } else {
    p.log.error("Prisma client not generated");
  }

  // Approvals
  total++;
  const approvalCheck = exec("polymarket approve check --output json");
  if (approvalCheck.ok) {
    try {
      const approvals = JSON.parse(approvalCheck.stdout);
      const allOk =
        Array.isArray(approvals) &&
        approvals.every(
          (a: Record<string, unknown>) =>
            a.ctf_approved !== false && a.usdc_approved !== false
        );
      if (allOk) {
        p.log.success("Contract approvals set");
        passed++;
      } else {
        p.log.error("Some contract approvals missing");
      }
    } catch {
      p.log.warn("Could not parse approval status");
    }
  } else {
    p.log.error("Could not check approvals");
  }

  // OpenClaw skill
  total++;
  const skillPath = join(
    homedir(),
    ".openclaw",
    "workspace",
    "skills",
    "nba-polymarket-trader",
    "SKILL.md"
  );
  if (existsSync(skillPath)) {
    p.log.success("OpenClaw skill synced");
    passed++;
  } else {
    p.log.warn("OpenClaw skill not synced (optional)");
  }

  p.outro(`${passed}/${total} checks passed`);
  process.exit(passed >= total - 1 ? 0 : 1); // OpenClaw is optional
}

// ── Interactive mode ──────────────────────────────────────

async function main() {
  p.intro("NBA Polymarket Agent Setup");

  // ── 1. Prerequisites ──

  const nodeMajor = parseInt(process.version.slice(1));
  if (nodeMajor >= 18) {
    p.log.success(`Node.js ${process.version}`);
  } else {
    p.log.error(`Node.js ${process.version} — version 18+ required`);
    process.exit(1);
  }

  const hasPolymarket = hasBin("polymarket");
  if (hasPolymarket) {
    p.log.success("Polymarket CLI installed");
  } else {
    p.log.warn("Polymarket CLI not found");
    p.note(
      "brew install polymarket/tap/polymarket-cli\npolymarket setup",
      "Install with"
    );
  }

  let walletAddress = "";
  if (hasPolymarket) {
    const w = exec("polymarket wallet address");
    if (w.ok && w.stdout) {
      walletAddress = w.stdout;
      p.log.success(`Wallet: ${walletAddress}`);
    } else {
      p.log.warn(
        "Wallet not configured — run `polymarket setup` after this wizard"
      );
    }
  }

  // ── 2. API Keys ──

  const envPath = join(ROOT, ".env");
  const existing = parseEnvFile(envPath);

  let finalOpenai = existing.OPENAI_API_KEY || "";
  let finalBdl = existing.BALLDONTLIE_API_KEY || "";
  let finalTwitter = existing.TWITTER_BEARER_TOKEN || "";

  if (finalOpenai) {
    p.log.success(`OpenAI API key: ${mask(finalOpenai)}`);
  } else {
    const val = await p.password({
      message: "OpenAI API key (required)",
      validate: (v) => {
        if (!v) return "Required — get one at platform.openai.com";
        if (!v.startsWith("sk-")) return "Should start with sk-";
      },
    });
    if (p.isCancel(val)) cancel();
    finalOpenai = val;
  }

  if (finalBdl) {
    p.log.success("BallDontLie API key: configured");
  } else {
    const val = await p.text({
      message: "BallDontLie API key (optional, Enter to skip)",
      placeholder: "Enter to skip",
    });
    if (p.isCancel(val)) cancel();
    finalBdl = val || "";
  }

  if (finalTwitter) {
    p.log.success("Twitter bearer token: configured");
  } else {
    const val = await p.text({
      message: "Twitter/X bearer token (optional, Enter to skip)",
      placeholder: "Enter to skip",
    });
    if (p.isCancel(val)) cancel();
    finalTwitter = val || "";
  }

  // ── 3. Write .env ──

  const envLines = [
    "# Required",
    `OPENAI_API_KEY=${finalOpenai}`,
    `NBA_AGENT_DIR=${ROOT}`,
    "",
    "# Optional",
    `BALLDONTLIE_API_KEY=${finalBdl}`,
    `TWITTER_BEARER_TOKEN=${finalTwitter}`,
    "",
    "# Database",
    'DATABASE_URL="file:./dev.db"',
    "",
  ];
  writeFileSync(envPath, envLines.join("\n"));
  p.log.success(".env written");

  // ── 4. Database ──

  const s = p.spinner();

  s.start("Running prisma generate...");
  const gen = exec("npx prisma generate");
  if (!gen.ok) {
    s.stop("prisma generate failed");
    p.log.error("Try running manually: npx prisma generate");
    process.exit(1);
  }
  s.stop("Prisma client generated");

  s.start("Initializing database...");
  const push = exec("npx prisma db push");
  if (!push.ok) {
    s.stop("Database init failed");
    p.log.error("Try running manually: npx prisma db push");
    process.exit(1);
  }
  s.stop("Database initialized");

  // ── 5. Polymarket approvals ──

  if (hasPolymarket && walletAddress) {
    s.start("Checking contract approvals...");
    const check = exec("polymarket approve check --output json");
    s.stop("Approvals checked");

    if (check.ok) {
      try {
        const approvals = JSON.parse(check.stdout);
        const allOk =
          Array.isArray(approvals) &&
          approvals.every(
            (a: Record<string, unknown>) =>
              a.ctf_approved !== false && a.usdc_approved !== false
          );
        if (allOk) {
          p.log.success("All contract approvals set");
        } else {
          const doApprove = await p.confirm({
            message:
              "Some approvals missing. Set them now? (requires POL for gas)",
          });
          if (!p.isCancel(doApprove) && doApprove) {
            s.start("Setting approvals (6 transactions)...");
            exec("polymarket approve set");
            s.stop("Approvals set");
          }
        }
      } catch {
        p.log.success("Approvals checked");
      }
    } else {
      p.log.warn(
        "Could not verify approvals — run `polymarket approve set` if needed"
      );
    }
  }

  // ── 6. OpenClaw (optional) ──

  const hasOpenClaw = hasBin("openclaw");
  if (hasOpenClaw) {
    const setupOC = await p.confirm({
      message: "Configure OpenClaw integration?",
      initialValue: true,
    });

    if (!p.isCancel(setupOC) && setupOC) {
      s.start("Configuring OpenClaw...");
      const ocConfigPath = join(homedir(), ".openclaw", "openclaw.json");

      if (existsSync(ocConfigPath)) {
        try {
          const config = JSON.parse(readFileSync(ocConfigPath, "utf-8"));

          if (!config.tools) config.tools = {};
          config.tools.profile = "full";

          if (!config.skills) config.skills = {};
          if (!config.skills.entries) config.skills.entries = {};

          const skillEnv: Record<string, string> = {
            OPENAI_API_KEY: finalOpenai,
            NBA_AGENT_DIR: ROOT,
          };
          if (finalBdl) skillEnv.BALLDONTLIE_API_KEY = finalBdl;
          if (finalTwitter) skillEnv.TWITTER_BEARER_TOKEN = finalTwitter;

          config.skills.entries["nba-polymarket-trader"] = {
            enabled: true,
            env: skillEnv,
          };

          writeFileSync(ocConfigPath, JSON.stringify(config, null, 2) + "\n");
          s.stop("OpenClaw config updated");
        } catch {
          s.stop("Could not update openclaw.json");
          p.log.warn("Edit ~/.openclaw/openclaw.json manually");
        }
      } else {
        s.stop("openclaw.json not found");
        p.log.warn("Run `openclaw onboard` first, then re-run setup");
      }

      // Sync skill to workspace
      s.start("Syncing skill to workspace...");
      exec(
        "mkdir -p ~/.openclaw/workspace/skills && rsync -a --delete skills/nba-polymarket-trader/ ~/.openclaw/workspace/skills/nba-polymarket-trader/"
      );
      s.stop("Skill synced to workspace");
    }
  }

  // ── 7. Summary ──

  const steps: string[] = [];

  if (!hasPolymarket) {
    steps.push(
      "Install Polymarket CLI:  brew install polymarket/tap/polymarket-cli"
    );
  }
  if (hasPolymarket && !walletAddress) {
    steps.push("Configure wallet:       polymarket setup");
  }
  if (walletAddress) {
    steps.push(
      "Fund wallet:            Send USDC.e + POL to " + walletAddress
    );
  }
  steps.push("Start dashboard:        npm run dev");
  steps.push(
    "Discover markets:       npx tsx skills/nba-polymarket-trader/scripts/discover.ts"
  );
  if (hasOpenClaw) {
    steps.push(
      'Via OpenClaw:           openclaw agent --message "discover NBA markets"'
    );
  }

  p.note(steps.join("\n"), "Next steps");
  p.outro("Setup complete!");
}

// ── Entry ─────────────────────────────────────────────────

if (isCheck) {
  checkMode();
} else {
  main().catch((err: Error) => {
    p.log.error(err.message);
    process.exit(1);
  });
}
