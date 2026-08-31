# PS 191 DIVA Functional Audit — 24 August 2026

## Current evidence

The application already has typed tRPC procedures, persistent object-storage report workflows, user-visible Dataset Lab controls, and server-side validation and comparison calculations. The selected India location search calls Nominatim/OpenStreetMap and Open-Meteo server-side, and it returns source-labelled boundary, population-when-supplied, weather, forecast, and air-quality context.

## Repairs required

The map component instantiates MapLibre with OpenStreetMap raster tiles, but also places a separate SVG-rendered national or local scenario illustration above it. That fallback must be removed so all layer geometry and interaction are supplied by MapLibre sources and layers alone.

The SVG fallback has now been removed and MapLibre is the only map renderer. Tile requests are returning HTTP 200, but the automated preview capture still shows a pale blank canvas immediately after navigation. The audit will next verify canvas paint timing and MapLibre lifecycle behavior with a dedicated browser check before treating the real-map repair as complete.

The managed map integration guidance requires the provided Google Maps component rather than an external map renderer. The GIS component was migrated accordingly and its loader now avoids duplicate script injection and renders a clear unavailable state on a loader failure. Browser verification immediately after the migration instead exposed a separate application-readiness regression: both default and India routes remained at the dashboard loading screen. This must be diagnosed before the managed-map migration can be accepted.

The managed Google Maps proxy returned HTTP 401 while its connector was disabled. An enablement request was submitted and declined, so that map service remains unavailable for this task. The application has therefore returned to the verified MapLibre/OpenStreetMap renderer rather than leaving users with a blank or unavailable map. It now renders only real geographic tiles and GeoJSON/raster sources; no SVG map fallback is present. Browser checks pass for canvas sizing, interactive Wayanad search/selected-context update, and nationwide state, population, terrain, weather, wind, sensitivity, and layer-toggle behavior.

The dashboard assessment and filtered hazardous-area workflows currently derive from an explicitly labelled DIVA scenario fixture. The audit will preserve it only as **DEMO DATA**, ensure visible actions and status are clear, and avoid presenting it as authoritative data. The real selected-location workflow must remain separate and source-labelled.

Selected-location context now performs a bounded, cached server-side OpenStreetMap/Overpass facility lookup. Up to forty nearby hospital, clinic, shelter, fire-station, or ambulance-station records are returned as a coordinate-centred sample, visibly source-labelled with retrieval status, and rendered only when the infrastructure layer is enabled. A zero-result or timeout is visibly unavailable and is never treated as proof that facilities do not exist. The previously inert mobile navigation, options menu, and scenario-panel close controls now execute stateful actions.

Dataset validation, vector parsing, historical prediction, and spatial comparison calculate results from provided geometry. Browser parsing presently retains several non-vector formats as source artifacts with limitations; unsupported vector extraction must stay visibly unavailable rather than be represented as a replay-ready result. Historical replay should reload committed parsed geometry from persistence rather than rely only on transient UI state.

Committed browser-readable vector geometry is now saved as nullable JSON metadata alongside its raw object-storage artifact, mapping, and validation record. When a case study is reopened, Dataset Lab reloads only persisted valid feature collections into its pre-event and ground-truth replay inputs. Raster or otherwise non-vector files remain stored artifacts with a visible adapter-needed status and cannot be misrepresented as replay-ready evidence.

The audit will also remove or connect inert visible controls, retain current weather/AQI summary fields, preserve stored PDF download workflows, and expand automated checks around the final demonstration paths.

The Reports archive procedure returns persisted assessment report metadata and the tested `/manus-storage/` link responds with a signed object-storage redirect. The archive currently contains assessment records; historical reports are added through the same persistent storage path only after a user runs a historical replay and requests its PDF, so no historical report row is fabricated for demonstration purposes.

Final visual verification confirms that an Assam deep link displays the selected India location panel, modelled forecast context, and source-labelled decision surfaces without the retained Kerala scenario panel competing in the active dashboard. The real-map diagnostic confirms a 652×590 MapLibre canvas and 45 OpenStreetMap tile requests after paint wait; the visual map surface therefore remains tied to geographic basemap data rather than an illustration.

The user approved finalization without waiting for externally supplied paired PRE_EVENT and GROUND_TRUTH vector datasets. The Dataset Lab now persists browser-readable geometry and reloads it for replay, comparison, and what-if calculations; however, the single live historical upload → report-archive evidence path remains explicitly deferred until authentic paired source files are provided. No synthetic geometry, historical replay result, or historical report was created to fill that evidence gap.

The closing audit exercised deterministic assessment reruns, the grounded narrative action, assessment PDF generation, report-archive visibility, source-artifact upload with the user's supplied attachment, layer toggles, base-style changes, zoom/reset, and fullscreen map entry. When the optional model provider returned malformed output, the narrative action now returns a labelled deterministic fallback based only on supplied analysis values and explicitly requires analyst review. Final automated validation passed 15 Vitest files / 31 tests, TypeScript, production build, nationwide and selected-location browser checks, real-map tile verification, visible desktop/mobile workflow checks, assessment action checks, and source-artifact upload checks. The production build retains a non-blocking large JavaScript bundle warning.
