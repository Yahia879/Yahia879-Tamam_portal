import { spawn } from "child_process";

const child = spawn("npx", ["drizzle-kit", "push"], {
  shell: true,
  stdio: ["pipe", "inherit", "inherit"]
});

const sendEnters = setInterval(() => {
  if (child.stdin.writable) {
    child.stdin.write("\r\n");
  }
}, 300);

child.on("close", (code) => {
  clearInterval(sendEnters);
  console.log(`drizzle-kit push exited with code ${code}`);
  process.exit(code || 0);
});
