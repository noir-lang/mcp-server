import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock git utilities
vi.mock("../../src/utils/git.js", () => ({
  cloneRepo: vi.fn(),
  getReposStatus: vi.fn(),
  REPOS_DIR: "/mock/repos",
}));

// Mock config - provide realistic repo data
vi.mock("../../src/repos/config.js", () => ({
  NOIR_REPOS: [
    {
      name: "noir",
      url: "https://github.com/noir-lang/noir",
      branch: "master",
      tag: "v1.0.0-beta.18",
      category: "core",
      description: "Noir compiler",
    },
    {
      name: "noir-examples",
      url: "https://github.com/noir-lang/noir-examples",
      branch: "master",
      category: "core",
      description: "Examples",
    },
    {
      name: "noir-bignum",
      url: "https://github.com/noir-lang/noir-bignum",
      branch: "main",
      category: "libraries",
      description: "Big integers",
    },
    {
      name: "awesome-noir",
      url: "https://github.com/noir-lang/awesome-noir",
      branch: "main",
      category: "reference",
      description: "Ecosystem index",
    },
  ],
  getNoirRepos: vi.fn(() => [
    {
      name: "noir",
      url: "https://github.com/noir-lang/noir",
      branch: "master",
      tag: "v1.0.0-beta.18",
      category: "core",
      description: "Noir compiler",
    },
    {
      name: "noir-examples",
      url: "https://github.com/noir-lang/noir-examples",
      branch: "master",
      category: "core",
      description: "Examples",
    },
    {
      name: "noir-bignum",
      url: "https://github.com/noir-lang/noir-bignum",
      branch: "main",
      category: "libraries",
      description: "Big integers",
    },
    {
      name: "awesome-noir",
      url: "https://github.com/noir-lang/awesome-noir",
      branch: "main",
      category: "reference",
      description: "Ecosystem index",
    },
  ]),
  DEFAULT_NOIR_VERSION: "v1.0.0-beta.18",
}));

const { cloneRepo, getReposStatus } = await import("../../src/utils/git.js");
const { syncRepos, getStatus } = await import("../../src/tools/sync.js");

const mockedCloneRepo = vi.mocked(cloneRepo);
const mockedGetReposStatus = vi.mocked(getReposStatus);

describe("tools/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("syncRepos()", () => {
    it("syncs core repos by default", async () => {
      mockedCloneRepo.mockResolvedValue("Cloned");

      const result = await syncRepos({});
      expect(result.success).toBe(true);
      expect(result.repos).toHaveLength(2); // noir + noir-examples
      expect(result.repos.every((r) => r.status === "Cloned")).toBe(true);
    });

    it("filters by specific repo names", async () => {
      mockedCloneRepo.mockResolvedValue("Cloned noir-bignum");

      const result = await syncRepos({ repos: ["noir-bignum"] });
      expect(result.repos).toHaveLength(1);
      expect(result.repos[0].name).toBe("noir-bignum");
    });

    it("filters by category", async () => {
      mockedCloneRepo.mockResolvedValue("Cloned");

      const result = await syncRepos({ categories: ["libraries"] });
      expect(result.repos).toHaveLength(1);
      expect(result.repos[0].name).toBe("noir-bignum");
    });

    it("returns failure when no repos match", async () => {
      const result = await syncRepos({ repos: ["nonexistent"] });
      expect(result.success).toBe(false);
      expect(result.message).toContain("No repositories matched");
      expect(result.repos).toHaveLength(0);
    });

    it("passes force flag to cloneRepo", async () => {
      mockedCloneRepo.mockResolvedValue("Cloned");

      await syncRepos({ force: true });
      expect(mockedCloneRepo).toHaveBeenCalledWith(
        expect.anything(),
        true
      );
    });

    it("handles cloneRepo errors gracefully", async () => {
      mockedCloneRepo
        .mockResolvedValueOnce("Cloned noir @ v1.0.0 (tag)")
        .mockRejectedValueOnce(new Error("network failure"));

      const result = await syncRepos({});
      expect(result.success).toBe(false);
      expect(result.repos).toHaveLength(2);
      expect(result.repos[0].status).toContain("Cloned");
      expect(result.repos[1].status).toContain("Error");
      expect(result.repos[1].status).toContain("network failure");
    });

    it("includes version in result", async () => {
      mockedCloneRepo.mockResolvedValue("Cloned");

      const result = await syncRepos({});
      expect(result.version).toBe("v1.0.0-beta.18");
    });

    it("uses custom version when provided", async () => {
      mockedCloneRepo.mockResolvedValue("Cloned");

      const result = await syncRepos({ version: "v0.50.0" });
      expect(result.version).toBe("v0.50.0");
    });

    it("preserves config order even when a later clone resolves first", async () => {
      // First repo (noir) resolves slowly; second (noir-examples) resolves
      // immediately. Result order must still follow the configured order.
      mockedCloneRepo.mockImplementation((config) =>
        config.name === "noir"
          ? new Promise((res) => setTimeout(() => res("Cloned noir"), 10))
          : Promise.resolve("Cloned noir-examples")
      );

      const result = await syncRepos({}); // core: noir, then noir-examples
      expect(result.repos.map((r) => r.name)).toEqual([
        "noir",
        "noir-examples",
      ]);
      expect(result.repos[0].status).toBe("Cloned noir");
      expect(result.repos[1].status).toBe("Cloned noir-examples");
    });
  });

  describe("getStatus()", () => {
    it("returns all repos with clone status", async () => {
      const statusMap = new Map([
        ["noir", { cloned: true, commit: "abc1234" }],
        ["noir-examples", { cloned: false }],
        ["noir-bignum", { cloned: false }],
        ["awesome-noir", { cloned: false }],
      ]);
      mockedGetReposStatus.mockResolvedValue(statusMap);

      const result = await getStatus();
      expect(result.reposDir).toBe("/mock/repos");
      expect(result.repos).toHaveLength(4);

      const noir = result.repos.find((r) => r.name === "noir");
      expect(noir?.cloned).toBe(true);
      expect(noir?.commit).toBe("abc1234");

      const examples = result.repos.find((r) => r.name === "noir-examples");
      expect(examples?.cloned).toBe(false);
      expect(examples?.commit).toBeUndefined();
    });
  });
});
