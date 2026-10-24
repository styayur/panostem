import assert from "node:assert/strict";
import {
  previewCapability,
  providerForUrl,
  resourceFrameUrl,
} from "../src/lib/previewPolicy.ts";
for (const url of [
  "https://falstad.com/circuit/",
  "http://www.falstad.com:80/circuit/?x=1#v",
  "https://FALSTAD.com:443//example.org/path",
]) {
  const frame = resourceFrameUrl({ source_id: "falstad", url });
  assert.ok(frame);
  assert.equal(new URL(frame).origin, "https://www.falstad.com");
}
for (const url of [
  "javascript:alert(1)",
  "data:text/html,x",
  "file:///C:/x",
  "https://falstad.com.evil.example/x",
  "https://evil.example/?falstad.com",
  "https://falstad.com@evil.example/",
  "https://user:password@falstad.com/x",
  "https://falstad.com:8443/x",
  "https://falstad.com./x",
  "https://falstad.com/\\npath",
  "https://[malformed",
  "//falstad.com/x",
  "https://falstad.com/" + String.fromCharCode(10) + "path",
]) {
  assert.equal(providerForUrl(url), undefined, url);
  assert.equal(resourceFrameUrl({ source_id: "falstad", url }), null, url);
}
assert.equal(
  resourceFrameUrl({ source_id: "phet", url: "https://falstad.com/x" }),
  null,
);
assert.equal(
  previewCapability({ source_id: "unknown", url: "https://falstad.com/" }),
  "NativeCard",
);
process.stdout.write(
  "PREVIEW SECURITY: canonical static iframe origin, default ports, credentials/suffix/control/malformed rejection and provider identity PASS\n",
);
