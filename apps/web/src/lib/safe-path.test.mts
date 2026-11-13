import { test } from "node:test";
import assert from "node:assert/strict";
import { safeLocalPath } from "./safe-path.ts";

test("keeps same-site paths", () => {
  assert.equal(safeLocalPath("/listings"), "/listings");
  assert.equal(safeLocalPath("/chats/ch_1?x=1#m"), "/chats/ch_1?x=1#m");
  assert.equal(safeLocalPath("/agent"), "/agent");
});

test("rejects anything that could leave the site", () => {
  for (const bad of ["//evil.com", "/.//evil.com", "/..//evil.com", "/%2e//evil.com", "/\\evil.com", "/\\/evil.com", "https://evil.com", "evil.com", "/%0d%0aevil", "\u0000/x", "", null, undefined]) {
    const out = safeLocalPath(bad as string);
    assert.ok(out === null || out.startsWith("/") && !out.startsWith("//"), `unsafe for ${JSON.stringify(bad)}: ${out}`);
  }
  assert.equal(safeLocalPath("//evil.com"), null);
  assert.equal(safeLocalPath("/\\evil.com"), null);
  assert.equal(safeLocalPath("https://evil.com"), null);
  // dot segments that normalize into a protocol-relative URL
  assert.equal(safeLocalPath("/.//evil.com"), null);
  assert.equal(safeLocalPath("/..//evil.com"), null);
  assert.equal(safeLocalPath("/a/..//evil.com"), null);
  assert.equal(safeLocalPath("/%2e//evil.com"), null);
});
