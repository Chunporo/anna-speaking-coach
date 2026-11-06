import { beforeEach, expect, it, vi } from "vitest";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
beforeEach(() => {
  useAuthStore.setState({ token: null, user: null });
  localStorage.clear();
});
it("adds bearer credentials and normalizes nested score strings while preserving unrelated values", async () => {
  useAuthStore.getState().setToken("example-session");
  let authorization: any;
  const response = await api.get("/progress", {
    adapter: async (config) => {
      authorization = config.headers.Authorization;
      return {
        data: [
          {
            fluency_score: "7.5",
            overall_band: "6",
            grammar_score: null,
            child: { pronunciation_score: "5.5", name: "word" },
            numbers: [1, "2"],
            nothing: null,
          },
        ],
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      };
    },
  });
  expect(authorization).toBe("Bearer example-session");
  expect(response.data).toEqual([
    {
      fluency_score: 7.5,
      overall_band: 6,
      grammar_score: null,
      child: { pronunciation_score: 5.5, name: "word" },
      numbers: [1, "2"],
      nothing: null,
    },
  ]);
});
it("allows anonymous requests and preserves audio blobs", async () => {
  const blob = new Blob(["voice"]);
  const result = await api.get("/audio", {
    adapter: async (config) => {
      expect(config.headers.Authorization).toBeUndefined();
      return { data: blob, status: 200, statusText: "OK", headers: {}, config };
    },
  });
  expect(result.data).toBe(blob);
});
it("clears persisted authentication on unauthorized responses and preserves other errors", async () => {
  const user = { id: 1, username: "learner", email: "learner@example.test" };
  useAuthStore.getState().setUser(user as any);
  useAuthStore.getState().setToken("sample-session");
  localStorage.setItem("access_token", "sample-session");
  localStorage.setItem("user", "learner");
  const unauthorized = { response: { status: 401 } };
  await expect(
    api.get("/private", { adapter: () => Promise.reject(unauthorized) }),
  ).rejects.toBe(unauthorized);
  expect(useAuthStore.getState().token).toBeNull();
  expect(useAuthStore.getState().user).toBeNull();
  expect(localStorage.getItem("access_token")).toBeNull();
  expect(localStorage.getItem("user")).toBeNull();
  useAuthStore.getState().setToken("next-session");
  await expect(
    api.get("/offline", {
      adapter: () => Promise.reject(new Error("offline")),
    }),
  ).rejects.toThrow("offline");
  expect(useAuthStore.getState().token).toBe("next-session");
});
