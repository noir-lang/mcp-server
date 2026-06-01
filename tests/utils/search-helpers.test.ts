import { describe, it, expect, vi } from "vitest";
import { join } from "path";

// We need to mock REPOS_DIR before importing the module under test,
// because parseRgOutput uses REPOS_DIR via `relative()`.
const MOCK_REPOS_DIR = "/mock/repos";

vi.mock("../../src/utils/git.js", () => ({
  REPOS_DIR: MOCK_REPOS_DIR,
  getRepoPath: (name: string) => join(MOCK_REPOS_DIR, name),
  isRepoCloned: () => false,
}));

// Must import after mocks are set up
const { parseRgOutput, getFileType } = await import(
  "../../src/utils/search.js"
);

describe("parseRgOutput()", () => {
  it("parses standard file:line:content format", () => {
    const output = `${MOCK_REPOS_DIR}/noir/src/main.nr:42:fn main() {}\n`;
    const results = parseRgOutput(output, 10);

    expect(results).toHaveLength(1);
    expect(results[0].file).toBe("noir/src/main.nr");
    expect(results[0].line).toBe(42);
    expect(results[0].content).toBe("fn main() {}");
    expect(results[0].repo).toBe("noir");
  });

  it("respects maxResults limit", () => {
    const lines = Array.from(
      { length: 10 },
      (_, i) => `${MOCK_REPOS_DIR}/noir/file${i}.nr:${i + 1}:line ${i}`
    ).join("\n");

    const results = parseRgOutput(lines, 3);
    expect(results).toHaveLength(3);
  });

  it("skips blank lines", () => {
    const output = `${MOCK_REPOS_DIR}/noir/a.nr:1:hello\n\n\n${MOCK_REPOS_DIR}/noir/b.nr:2:world\n`;
    const results = parseRgOutput(output, 10);
    expect(results).toHaveLength(2);
  });

  it("skips malformed lines", () => {
    const output = [
      `${MOCK_REPOS_DIR}/noir/good.nr:1:valid line`,
      "this is not a valid rg line",
      `${MOCK_REPOS_DIR}/noir/also-good.nr:2:another valid`,
    ].join("\n");

    const results = parseRgOutput(output, 10);
    expect(results).toHaveLength(2);
  });

  it("handles content containing colons", () => {
    const output = `${MOCK_REPOS_DIR}/noir/test.nr:5:let x: Field = 42;\n`;
    const results = parseRgOutput(output, 10);

    expect(results).toHaveLength(1);
    expect(results[0].content).toBe("let x: Field = 42;");
  });

  it("extracts relative paths and repo names", () => {
    const output = `${MOCK_REPOS_DIR}/noir-bignum/src/lib.nr:10:use dep;\n`;
    const results = parseRgOutput(output, 10);

    expect(results[0].file).toBe("noir-bignum/src/lib.nr");
    expect(results[0].repo).toBe("noir-bignum");
  });

  it("returns empty array for empty input", () => {
    expect(parseRgOutput("", 10)).toEqual([]);
  });
});

describe("getFileType()", () => {
  it('returns "circuit" for .nr files', () => {
    expect(getFileType("src/main.nr")).toBe("circuit");
  });

  it('returns "test" for .nr files with "test" in path', () => {
    expect(getFileType("test/my_test.nr")).toBe("test");
    expect(getFileType("src/tests/check.nr")).toBe("test");
  });

  it('returns "typescript" for .ts and .tsx files', () => {
    expect(getFileType("index.ts")).toBe("typescript");
    expect(getFileType("component.tsx")).toBe("typescript");
  });

  it('returns "docs" for .md and .mdx files', () => {
    expect(getFileType("README.md")).toBe("docs");
    expect(getFileType("guide.mdx")).toBe("docs");
  });

  it('returns "other" for everything else', () => {
    expect(getFileType("Cargo.toml")).toBe("other");
    expect(getFileType("main.rs")).toBe("other");
    expect(getFileType("package.json")).toBe("other");
  });
});
