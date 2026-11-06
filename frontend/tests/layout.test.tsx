import React from "react";
import { expect, it, vi } from "vitest";
vi.mock("next/font/google", () => ({
  Inter: () => ({ className: "test-inter-font" }),
}));
import RootLayout, { metadata } from "@/app/layout";
it("provides Vietnamese document language, font, metadata and child content", () => {
  const child = <main>Speaking practice</main>;
  const tree = RootLayout({ children: child });
  expect(tree.type).toBe("html");
  expect(tree.props.lang).toBe("vi");
  expect(tree.props.children.type).toBe("body");
  expect(tree.props.children.props.className).toBe("test-inter-font");
  expect(tree.props.children.props.children).toBe(child);
  expect(metadata.title).toBe("Anna - IELTS Speaking Practice");
  expect(metadata.description).toBe("Self-practice IELTS Speaking platform");
});
