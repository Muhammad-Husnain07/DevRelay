#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

function log(msg, color = RESET) {
  console.log(`${color}${msg}${RESET}`);
}

function step(num, desc) {
  log(`\n${GREEN}Step ${num}:${RESET} ${desc}`);
}

function run(cmd, options = {}) {
  try {
    log(`Running: ${cmd}`, YELLOW);
    execSync(cmd, { stdio: "inherit", ...options });
    return true;
  } catch (err) {
    log(`Error: ${err.message}`, RED);
    return false;
  }
}

function checkDocker() {
  step("1", "Checking Docker...");
  try {
    execSync("docker --version", { stdio: "ignore" });
    log("Docker is installed", GREEN);
    return true;
  } catch {
    log("Docker is not installed. Please install Docker Desktop first.", RED);
    log(
      "Download from: https://www.docker.com/products/docker-desktop/",
      YELLOW,
    );
    return false;
  }
}

function checkEnvFile() {
  step("2", "Setting up environment...");
  const envExample = path.join(__dirname, "..", ".env.example");
  const envFile = path.join(__dirname, "..", ".env");

  if (!fs.existsSync(envFile)) {
    if (fs.existsSync(envExample)) {
      fs.copyFileSync(envExample, envFile);
      log("Created .env file from .env.example", GREEN);
      log("Please edit .env file with your settings", YELLOW);
    } else {
      log(".env.example not found", RED);
      return false;
    }
  } else {
    log(".env file already exists", GREEN);
  }

  // Warn if using default JWT secret
  const envContent = fs.readFileSync(envFile, "utf8");
  if (envContent.includes("your-super-secret-jwt-key")) {
    log("WARNING: You should change JWT_SECRET in .env for production!", RED);
  }

  return true;
}

async function startInfrastructure() {
  step("3", "Starting infrastructure (MongoDB & Redis)...");

  log("Starting Docker containers...", YELLOW);
  if (
    !run("docker compose up -d mongo redis", {
      cwd: path.join(__dirname, ".."),
    })
  ) {
    return false;
  }

  log("Waiting for services to be ready...", YELLOW);
  await new Promise((resolve) => setTimeout(resolve, 10000));

  // Check MongoDB
  log("Checking MongoDB...", YELLOW);
  try {
    execSync(
      "docker compose exec -T mongo mongosh --quiet devrelay --eval \"db.adminCommand('ping')\"",
      {
        cwd: path.join(__dirname, ".."),
        stdio: "ignore",
      },
    );
    log("MongoDB is ready", GREEN);
  } catch {
    log("MongoDB not ready yet, continuing...", YELLOW);
  }

  // Check Redis
  log("Checking Redis...", YELLOW);
  try {
    execSync("docker compose exec -T redis redis-cli ping", {
      cwd: path.join(__dirname, ".."),
      stdio: "ignore",
    });
    log("Redis is ready", GREEN);
  } catch {
    log("Redis not ready yet, continuing...", YELLOW);
  }

  return true;
}

async function seedDatabase() {
  step("4", "Seeding database with demo data...");

  // Start app container to run seed
  log("Building and starting app...", YELLOW);
  if (
    !run("docker compose up -d app --build", {
      cwd: path.join(__dirname, ".."),
    })
  ) {
    return false;
  }

  log("Waiting for app to be ready...", YELLOW);
  await new Promise((resolve) => setTimeout(resolve, 15000));

  // Check if seed script exists
  const seedScript = path.join(__dirname, "..", "scripts", "seed.js");
  if (fs.existsSync(seedScript)) {
    log("Running seed script...", YELLOW);
    try {
      execSync("docker compose exec -T app node scripts/seed.js", {
        cwd: path.join(__dirname, ".."),
        stdio: "inherit",
      });
      log("Database seeded successfully", GREEN);
    } catch {
      log("Seed script may have already run or failed", YELLOW);
    }
  } else {
    log("Seed script not found, skipping...", YELLOW);
  }

  return true;
}

function showNextSteps() {
  step("5", "Setup Complete!");

  console.log(`
${GREEN}════════════════════════════════════════════════════════════${RESET}
                    DevRelay is Ready!
${GREEN}════════════════════════════════════════════════════════════${RESET}

📍 Access Points:
   • API Server:     http://localhost:3000
   • API Docs:       http://localhost:3000/api/docs/
   • MongoDB:        localhost:27017
   • Redis:          localhost:6379

🔑 Default Login:
   • Email:    demo@devrelay.io
   • Password: demo123

📝 Next Steps:
   1. Open http://localhost:3000 in your browser
   2. Login with demo credentials
   3. Create your first workspace
   4. Explore webhooks, jobs, scheduler, and gateway features

📚 Commands:
   • docker compose logs -f      # View logs
   • docker compose down         # Stop services
   • docker compose up -d        # Start services
   • docker compose ps           # Check status

${YELLOW}For more info, check README.md${RESET}
  `);
}

async function main() {
  log("════════════════════════════════════════════════════════════");
  log("              DevRelay Easy Setup Script");
  log("════════════════════════════════════════════════════════════");

  if (!checkDocker()) process.exit(1);
  if (!checkEnvFile()) process.exit(1);
  if (!(await startInfrastructure())) process.exit(1);
  if (!(await seedDatabase())) process.exit(1);

  showNextSteps();
}

main();
