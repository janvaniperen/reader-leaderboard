import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validLogoDomain, buildLogoDevUrl } from "../lib/logo.js";

describe("validLogoDomain", () => {
  it("accepts normal domains", () => {
    assert.equal(validLogoDomain("iff.com"), true);
    assert.equal(validLogoDomain("in.nestle.com"), true);
    assert.equal(validLogoDomain("doehler.com.br"), true);
  });

  it("rejects invalid input", () => {
    assert.equal(validLogoDomain(""), false);
    assert.equal(validLogoDomain("not-a-domain"), false);
    assert.equal(validLogoDomain("https://evil.com"), false);
    assert.equal(validLogoDomain("evil.com/path"), false);
    assert.equal(validLogoDomain("..evil.com"), false);
  });
});

describe("buildLogoDevUrl", () => {
  it("includes token, size, webp, and fallback=404", () => {
    const url = new URL(buildLogoDevUrl("iff.com", "pk_test"));
    assert.equal(url.hostname, "img.logo.dev");
    assert.equal(url.pathname, "/iff.com");
    assert.equal(url.searchParams.get("token"), "pk_test");
    assert.equal(url.searchParams.get("size"), "64");
    assert.equal(url.searchParams.get("format"), "webp");
    assert.equal(url.searchParams.get("fallback"), "404");
  });
});
