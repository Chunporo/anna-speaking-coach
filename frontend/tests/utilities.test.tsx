import React from "react";
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { formatTime, getScoreColor, calculateOverallScore } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errorHandler";
import Feedback from "@/components/FeedbackRenderer";
it("formats seconds and classifies score boundaries", () => {
  expect(formatTime(0)).toBe("0:00");
  expect(formatTime(125)).toBe("2:05");
  expect([null, 0, 5, 6, 7, 9].map(getScoreColor)).toEqual([
    "text-gray-400",
    "text-gray-400",
    "text-red-600",
    "text-yellow-600",
    "text-green-600",
    "text-green-600",
  ]);
  expect(calculateOverallScore(7, 6, 6, 8)).toBe(6.8);
  for (let i = 0; i < 4; i++) {
    const scores = [7, 7, 7, 7];
    scores[i] = 0;
    expect(
      calculateOverallScore(...(scores as [number, number, number, number])),
    ).toBeNull();
  }
});
it("prioritizes backend detail, backend message, native message then fallback", () => {
  expect(
    getErrorMessage({
      response: { data: { detail: "detail", message: "message" } },
      message: "native",
    }),
  ).toBe("detail");
  expect(getErrorMessage({ response: { data: { message: "message" } } })).toBe(
    "message",
  );
  expect(getErrorMessage(new Error("native"))).toBe("native");
  expect(getErrorMessage({})).toBe("An unexpected error occurred");
});
it("renders no feedback and plain markdown without recognized section headings", () => {
  const { rerender, container } = render(<Feedback feedback="" />);
  expect(container).toBeEmptyDOMElement();
  rerender(<Feedback feedback="**Plain feedback**" />);
  expect(screen.getByText("Plain feedback").tagName).toBe("STRONG");
});
it("renders all feedback sections with rich markdown structures", () => {
  render(
    <Feedback
      feedback={
        "## 📊 Tổng thể\n**Strong** paragraph\n\n- bullet\n\n1. ordered\n\n> quote\n\n---\n\n`sample`\n\n```\nblock\n```\n## ✅ Điểm mạnh\nGood\n## 🎯 Những điểm cần cải thiện\nImprove\n## 📝 Bản ghi sửa lỗi\nCorrected\n## 💡 Gợi ý cải thiện\nSuggestions"
      }
    />,
  );
  expect(screen.getAllByRole("heading")).toHaveLength(5);
  expect(screen.getByText("bullet")).toBeInTheDocument();
  expect(screen.getByText("ordered")).toBeInTheDocument();
  expect(screen.getByText("quote").closest("blockquote")).toBeInTheDocument();
  expect(screen.getByText("Suggestions")).toBeInTheDocument();
});
it("preserves nested markdown headings and their content inside recognized feedback sections", () => {
  render(
    <Feedback
      feedback={
        "## 📊 Tổng thể\nOverview\n\n### Detailed feedback\nKeep this explanation.\n\n#### Example\nKeep this example.\n\n## ✅ Điểm mạnh\nClear delivery"
      }
    />,
  );
  expect(
    screen.getByRole("heading", { name: "Detailed feedback", level: 3 }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Example", level: 4 }),
  ).toBeInTheDocument();
  expect(screen.getByText("Keep this explanation.")).toBeInTheDocument();
  expect(screen.getByText("Keep this example.")).toBeInTheDocument();
  expect(screen.getByText("Clear delivery")).toBeInTheDocument();
});
