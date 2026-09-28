import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { acquireLock, acquireLocks, agsLockPath, hostLockPath, lockState, operationLocks, processAlive, runsLockPath, withLock } from "../scripts/lib/reports.mjs";
import { tempDir } from "./helpers/fixtures.mjs";

const QUICK = { waitMs: 150 };

function writeOwner(lockDir, pid, command = "host install") {
  fs.mkdirSync(lockDir, { recursive: true });
  fs.writeFileSync(path.join(lockDir, "owner.json"), JSON.stringify({ command, pid, startedAt: "2026-09-28T10:00:00.000Z" }));
}

function age(lockDir, seconds) {
  const when = new Date(Date.now() - seconds * 1000);
  fs.utimesSync(lockDir, when, when);
}

function endedPid() {
  return spawnSync(process.execPath, ["-e", ""]).pid;
}

test("lock paths sit under .tmp/ags/locks", () => {
  const root = tempDir("ags-lockpaths-");
  assert.equal(hostLockPath(root), path.join(root, ".tmp", "ags", "locks", "host"));
  assert.equal(agsLockPath(root), path.join(root, ".tmp", "ags", "locks", "ags"));
  assert.equal(runsLockPath(root), path.join(root, ".tmp", "ags", "locks", "runs"));
  assert.deepEqual(operationLocks({ hostRoot: root }), [hostLockPath(root)]);
});

test("a lock records its owner and a concurrent holder blocks until released", async () => {
  const lockDir = hostLockPath(tempDir("ags-lock-"));
  const release = await acquireLock(lockDir, "host update");
  const owner = JSON.parse(fs.readFileSync(path.join(lockDir, "owner.json"), "utf8"));
  assert.equal(owner.command, "host update");
  assert.equal(owner.pid, process.pid);
  assert.match(owner.startedAt, /^\d{4}-\d\d-\d\dT/);
  await assert.rejects(acquireLock(lockDir, "host install", QUICK), (error) => {
    assert.equal(error.exitCode ?? 1, 1);
    assert.match(error.message, /Lock held by host update \(pid \d+/);
    assert.ok(error.message.includes(lockDir));
    return true;
  });
  release();
  assert.equal(fs.existsSync(lockDir), false);
  await withLock(lockDir, "host install", () => assert.ok(fs.existsSync(lockDir)), QUICK);
  assert.equal(fs.existsSync(lockDir), false);
});

test("a lock whose process has ended is taken over", async () => {
  const lockDir = hostLockPath(tempDir("ags-lock-"));
  const pid = endedPid();
  assert.equal(processAlive(pid), false);
  writeOwner(lockDir, pid);
  assert.equal(lockState(lockDir).stale, true);
  const release = await acquireLock(lockDir, "host install", QUICK);
  assert.equal(JSON.parse(fs.readFileSync(path.join(lockDir, "owner.json"), "utf8")).pid, process.pid);
  release();
});

test("a live lock older than 15 seconds still blocks", async () => {
  const lockDir = agsLockPath(tempDir("ags-lock-"));
  const child = spawn(process.execPath, ["-e", "setTimeout(() => {}, 60000)"], { stdio: "ignore" });
  try {
    writeOwner(lockDir, child.pid, "version bump");
    age(lockDir, 60);
    assert.equal(lockState(lockDir).stale, false);
    await assert.rejects(acquireLock(lockDir, "host install", QUICK), /Lock held by version bump/);
    assert.equal(fs.existsSync(lockDir), true);
  } finally {
    child.kill();
  }
});

test("a lock without a record is taken over only once older than 15 seconds", async () => {
  const lockDir = hostLockPath(tempDir("ags-lock-"));
  fs.mkdirSync(lockDir, { recursive: true });
  assert.equal(lockState(lockDir).stale, false);
  await assert.rejects(acquireLock(lockDir, "host install", QUICK), /Lock held by an unknown process/);
  age(lockDir, 16);
  assert.equal(lockState(lockDir).stale, true);
  const release = await acquireLock(lockDir, "host install", QUICK);
  release();
});

test("host then AGS locks are taken in order and released in reverse; a failure releases what was taken", async () => {
  const host = tempDir("ags-lockhost-");
  const ags = tempDir("ags-lockags-");
  const release = await acquireLocks(operationLocks({ hostRoot: host, agsRoot: ags }), "host install");
  assert.ok(fs.existsSync(hostLockPath(host)) && fs.existsSync(agsLockPath(ags)));
  release();
  assert.ok(!fs.existsSync(hostLockPath(host)) && !fs.existsSync(agsLockPath(ags)));

  const holder = await acquireLock(agsLockPath(ags), "version bump");
  await assert.rejects(acquireLocks(operationLocks({ hostRoot: host, agsRoot: ags }), "host install", QUICK), /Lock held by version bump/);
  assert.equal(fs.existsSync(hostLockPath(host)), false);
  holder();
});
