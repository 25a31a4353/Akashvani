// @vitest-environment jsdom

import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AssamDisasterHistory } from "../../client/src/components/diva/AssamDisasterHistory";
import { AssamStateProfile } from "../../client/src/components/diva/AssamStateProfile";

describe("Assam focus panels", () => {
  it("renders the source-labelled state profile and operational context groups", () => {
    render(createElement(AssamStateProfile));
    expect(screen.getByTestId("assam-state-profile")).toBeTruthy();
    expect(screen.getByText("A–Z operational context")).toBeTruthy();
    expect(screen.getByText("78,438 sq km")).toBeTruthy();
    expect(screen.getByText("398 persons / sq km")).toBeTruthy();
  });

  it("renders the 2016–2025 history window without substituting unverified annual impact totals", () => {
    render(createElement(AssamDisasterHistory));
    expect(screen.getByTestId("assam-disaster-history")).toBeTruthy();
    expect(screen.getByText("Ten-year evidence window · 2016–2025")).toBeTruthy();
    expect(screen.getAllByText("Year-specific impacts require the corresponding ASDMA report to be normalized.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Source directory")).toHaveLength(10);
  });
});
