# Simplification findings

- The dashboard now opens with four primary navigation items: Dashboard, Map, Risk assessment, and Site capacity; secondary workspaces remain available under More workspaces.
- Dashboard insights charts are hidden by default behind Show insights, and selected-location forecast/infrastructure detail is hidden behind Show full location details.
- GIS controls now present a single selected-location card, collapsed Hazards controls, a compact risk key, and a simpler Location summary / Relocation plan heading.
- Historical tools use a lighter header and shorter tab labels: Dataset, Replay, Simulate, and Cases.
- Desktop and mobile previews were visually checked. The GIS map fills after tiles settle; the first concurrent capture can show a brief blank tile state while MapLibre loads.
- TypeScript and 42 Vitest tests pass after the simplification changes; a prior production build also passed before the final small label correction.
The final desktop and mobile previews confirm the simplified shell: the dashboard opens with a compact map-and-summary view, the GIS workspace keeps its focused dark map layout, the reports route exposes secondary navigation clearly, and mobile retains an accessible menu button. The simplified loading copy and disclosure labels are covered by the helper test suite.

## Selected-area decision context and report action visual review

The first two desktop captures of `/?location=assam` landed on the explicit selected-location loading card because the external context and satellite tile requests had not settled within the screenshot capture window. The browser-level verifier waited for the actual forecast card and confirmed that the new decision context/report action flow renders and is ordered correctly after hydration. No runtime error was observed in the recent server, console, or network logs; imagery requests returned HTTP 200.

## Decision context/report export review

The settled desktop capture shows the selected-location decision context as a dark, high-contrast summary with risk, population, weather, air-quality, forecast, decision readout, and data-status blocks. The visible Details Forecast is followed immediately by the complete selected-area analysis PDF action and then the Show full location details control, matching the requested order. The automated mobile flow verifies the same ordering after hydration; the managed screenshot capture can still land on the intentional loading card when external context is not settled within its capture window.
