# EcoDash: African Digital Logistics & Infrastructure Simulator

EcoDash is a browser-based, 2D logistics simulation about a solar-powered drone delivering essential supplies to connected communities. Fly across a fictional rural district, navigate infrastructure and environmental constraints, and plan around battery range, weather and intermittent microgrid service.

> **Coursework and AI disclosure:** This starter implementation was generated with AI assistance in response to the assignment brief. Review, test, modify, and be prepared to explain every part before submission. See [documentation/ai-reflection.md](documentation/ai-reflection.md). The day/night cycle is clearly isolated as the feature for you to personalise and explain; do not describe AI-generated code as wholly unaided work.

## Features

- Canvas-rendered, responsive top-down landscape with roads, settlements, river crossings, Kenney Cartography Pack tree and house sprites, solar hubs, a dispatch point and a route marker.
- Smooth drone flight with acceleration, velocity, drag, turning, wind drift and frame-rate-independent updates.
- Battery drain influenced by speed, weather, rough construction areas and charging availability.
- Five successive supply missions to fictional communities, plus score, kilometres travelled and efficiency telemetry.
- Interactive potholes, fallen trees, wildlife, road traffic and construction hazards with collision feedback and score/battery penalties.
- Changing wind, rain and dust, timed load-shedding outages, and an original day/night visual cycle.
- Start, playing, pause and route-report/game-over states; keyboard controls; restart without refreshing.
- Persistent personal best using localStorage and optional synthesized Web Audio tones (no audio files needed).
- No frameworks, remote image requests, build step, or server-side code.

## Technologies

HTML5 Canvas, semantic HTML, CSS3, and vanilla JavaScript ES6+. The game uses the browser's `requestAnimationFrame`, Canvas 2D API, Web Audio API, and `localStorage`. The JavaScript remains separated into small files loaded as ordered classic scripts, so it does not rely on ES module loading or a build tool.

## Controls

| Input | Action |
| --- | --- |
| W / ↑ | Fly north |
| A / ← | Fly west |
| S / ↓ | Fly south |
| D / → | Fly east |
| P / Esc | Pause or resume |
| Sound button | Toggle synthesized sound |

Point toward a destination marker and fly within its community delivery area. Solar hubs recharge only when they are online; the display indicates timed load-shedding interruptions. The five-delivery target completes a route, but running out of battery also ends the run.

## Run locally / publish

1. Open this folder in VS Code or File Explorer.
2. Open `index.html` directly in a modern browser. Live Server is optional for development, not required.
3. To publish, push the contents of this folder (so `index.html` is at the published root) to the `EcoDash-African-Logistics` GitHub repository and enable GitHub Pages for that branch/root.

There are no dependency-installation, compilation, or runtime server steps. All JavaScript, CSS, and future assets use relative paths. No external libraries, remote fonts, JSON requests, or backend APIs are needed. Browser privacy settings may limit `localStorage` for `file://` pages; the game catches storage errors and continues, while normal GitHub Pages hosting supports persistent high scores.

## Project structure

```text
EcoDash-African-Logistics/
├── index.html
├── README.md
├── css/style.css
├── js/
│   ├── main.js          # DOM setup, HUD, and button wiring
│   ├── game.js          # Game loop, state, world drawing and orchestration
│   ├── player.js        # Drone physics and rendering
│   ├── obstacles.js     # Hazard objects and world feature data
│   ├── missions.js      # Delivery destinations and mission assignment
│   ├── weather.js       # Dynamic weather and wind
│   ├── particles.js     # Small collision/delivery effects
│   ├── storage.js       # High-score persistence
│   └── utils.js         # Reusable maths/drawing helpers
├── assets/
│   ├── audio/           # Optional future audio files
│   └── images/          # Optional future original artwork
├── PNG/Default/         # CC0 tree, bush, palm, and house sprites
└── documentation/
    ├── african-context-report.md
    ├── ai-reflection.md
    └── wireframe.md
```

## How the simulation works

### Game loop and states

`EcoDashGame` requests a browser animation frame repeatedly. It calculates elapsed time in seconds (capped to avoid a huge step after a tab is backgrounded), updates simulation only while playing, draws a frame, and refreshes the HUD. Start resets the game data; pause freezes simulation; resume restores it; delivery goal or empty battery opens the route report. The HTML overlay is switched to match each state. The animation loop continues drawing while menus are visible.

### Physics and trigonometry

The keyboard creates a 2D input vector. Normalising it prevents diagonal input from being stronger than straight input. `Math.atan2(y, x)` converts the vector into a heading. `Math.cos(heading)` and `Math.sin(heading)` turn that angle back into horizontal and vertical acceleration components. Velocity is updated by acceleration times elapsed seconds, and position by velocity times elapsed seconds. A power-based drag factor gradually reduces velocity without making the feel depend on frame rate. A speed cap keeps steering manageable. Weather wind is added as an acceleration vector.

### Collision detection

Round hazards compare centre distance with the sum of collision radii. Rectangular hazards use a circle-versus-AABB test: clamp the drone centre to the nearest point on the rectangle, then compare that point's distance with the drone radius. This is more accurate than checking only whether bounding rectangles overlap. A hit briefly cools down repeated collisions, restores the previous position, reduces battery and score, and creates particles/sound feedback.

### Battery and solar charging

Battery begins at 100%. While moving, it drains over time, scaled by speed and a terrain/weather multiplier. Wind can push the drone, while rain and dust have their own multipliers. Entering an active solar microgrid circle adds charge each second; a separate timed outage can disable a hub temporarily. Efficiency compares observed travel distance against a calm-weather expected energy baseline; it is an in-game indicator, not a real-world drone specification.

### Missions, weather, and scoring

`MissionManager` chooses a destination different from the previous one and assigns one of the cargo types. It measures distance to the destination and reports route progress; entering the delivery radius awards points and assigns another mission. Weather cycles among clear skies, crosswind, light rain and dusty gusts. Wind affects motion and consumption, while rain/dust also change Canvas appearance. A delivery adds points; collisions subtract points; distance, energy efficiency and deliveries are shown separately.

The score includes 10 points per kilometre travelled, the mission's 500-point delivery reward, an efficiency bonus (up to 150 points), and a 100-point clean-route bonus when no collision occurred during that delivery. Each collision subtracts 35 points. This makes careful routing and efficient energy use matter in addition to completing deliveries.

### African context and original feature

The setting represents a fictional, rural African district through connected settlements, unpaved access tracks, a river with limited crossings, solar microgrids and load-shedding. These elements frame last-mile access as a systems and infrastructure challenge, not a caricature of people or places. Read [documentation/african-context-report.md](documentation/african-context-report.md) for context and limitations.

**Original feature to personalise:** the day/night cycle is explicitly marked in `js/game.js` under `ORIGINAL FEATURE — DAY / NIGHT CYCLE`. It uses a sine curve to vary the daylight overlay and moves a sun/moon indicator across the view. The provided starter code was AI-assisted; change the cycle/palette/visual effect yourself and record what you personally changed and learned in your reflection.

### LocalStorage and audio

`js/storage.js` reads and writes the best score under `ecodash-high-score-v1`. Errors are caught so storage restrictions do not crash the game. Web Audio oscillators create short original tones at run-time, so the game does not include third-party sound recordings. Optional future audio files can go in `assets/audio/`; use properly licensed or self-created clips and update the code to load them if needed.

## Code defence checklist

Be ready to describe: the `requestAnimationFrame` loop and delta time; normalised input, vectors, velocity/acceleration and trig; the two collision maths approaches; time-based battery and charger/outage logic; localStorage key and error handling; state transitions; mission distance/progress; weather forces/multipliers; and how `PlayerDrone`, `MissionManager`, `WeatherSystem`, and `Obstacle` objects divide responsibility.

## AI usage disclosure

AI assisted with the initial implementation and documentation. This disclosure is intentionally explicit and should be updated to reflect the tools and changes actually used for your submitted version. Do not claim that AI-generated sections were independently authored. Refer to [documentation/ai-reflection.md](documentation/ai-reflection.md) and follow your institution's academic-integrity rules.
