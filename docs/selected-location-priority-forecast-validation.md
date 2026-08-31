# Selected-Location Priority and Forecast Validation

The active India selection now renders a location-derived priority summary and a separate decision-table row. The retained demonstration priority queue is hidden when a selected India context is active.

The active India sidebar, summary strip, forecast panels, and GIS map context show selected-location forecast detail. The sidebar and map overlay display the environmental retrieval time. These values are supplied as **Open-Meteo modelled context** and are not official warnings or local observation-network measurements.

The final validation run on 24 August 2026 completed successfully: 15 Vitest files / 30 tests, TypeScript checking, production build, and Chromium verification for Assam (state), Nizamabad (city/mobile), Guntur (district), Banjara Hills (locality/mobile), and the India-wide overview.

The production build retains the existing Vite large-chunk warning; it is a size advisory only and did not prevent the build.
