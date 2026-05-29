import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { aggregate } from "../lib/aggregate.js";

describe("aggregate", () => {
  it("deduplicates emails case-insensitively", () => {
    const result = aggregate([
      "alice@acme.com",
      "Alice@acme.com",
      "  BOB@acme.com  ",
    ]);
    assert.equal(result.totals.activeSubscribers, 2);
    assert.equal(result.companies[0].count, 2);
  });

  it("excludes personal email domains", () => {
    const result = aggregate([
      "alice@gmail.com",
      "bob@acme.com",
    ]);
    assert.equal(result.totals.personalEmailReaders, 1);
    assert.equal(result.totals.attributedReaders, 1);
    assert.equal(result.companies.length, 1);
    assert.equal(result.companies[0].company, "Acme");
  });

  it("merges domains via DOMAIN_TO_COMPANY overrides", () => {
    const result = aggregate([
      "a@doehler.com",
      "b@doehler.com.br",
    ]);
    assert.equal(result.companies.length, 1);
    assert.equal(result.companies[0].company, "Döhler");
    assert.equal(result.companies[0].count, 2);
    assert.deepEqual(result.companies[0].domains.sort(), ["doehler.com", "doehler.com.br"]);
  });

  it("sorts by count descending then alphabetically", () => {
    const result = aggregate([
      "a@zebra.com",
      "b@alpha.com",
      "c@alpha.com",
      "d@alpha.com",
    ]);
    assert.equal(result.companies[0].company, "Alpha");
    assert.equal(result.companies[0].count, 3);
    assert.equal(result.companies[1].company, "Zebra");
    assert.equal(result.companies[1].count, 1);
  });

  it("derives names from ccTLD domains", () => {
    const result = aggregate(["a@example.co.uk"]);
    assert.equal(result.companies[0].company, "Example");
  });

  it("rolls up subdomains under the same company name", () => {
    const result = aggregate([
      "a@acme.com",
      "b@mail.acme.com",
    ]);
    assert.equal(result.companies.length, 1);
    assert.equal(result.companies[0].count, 2);
    assert.equal(result.companies[0].logoDomain, "acme.com");
  });

  it("skips invalid emails", () => {
    const result = aggregate(["not-an-email", "", null, "valid@corp.com"]);
    assert.equal(result.totals.activeSubscribers, 1);
  });
});
