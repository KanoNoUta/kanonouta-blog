var e=`\r
			<blockquote><p>WebTimeline is still in an early stage of development. This article records the journey from the first prototype to a usable editing loop; it does not represent the final product.</p></blockquote>\r
\r
			<h2>Why Build WebTimeline?</h2>\r
			<p>PromeRotation has a powerful timeline system, but writing a timeline that is genuinely usable is not easy.</p>\r
			<p>Traditionally, ACR authors or players familiar with the plugin structure maintained timeline JSON directly. Why a skill triggers at a certain point, which phase it belongs to, who it targets, and whether it conflicts with cooldowns are all hidden in fields, conditions, and nested structures. For an ordinary player, even moving one mitigation skill a few seconds earlier requires understanding the entire configuration.</p>\r
			<p>I did not want to invent another timeline format. I wanted to turn existing formats into an interface that could be seen, dragged, and checked.</p>\r
			<ul>\r
				<li>New users can directly inspect the Boss baseline and ACR simulation.</li>\r
				<li>People making small adjustments can drag skills, edit times, and choose targets.</li>\r
				<li>Existing timelines can be imported and returned to the plugin after editing.</li>\r
				<li>The system handles complex logic while the user works with time and skills.</li>\r
			</ul>\r
			<p>That became WebTimeline's original goal: turn a code-oriented timeline workflow into a real timeline editor.</p>\r
\r
			<h2>Stage One: Make the Timeline Visible</h2>\r
			<p>On July 8, 2026, the first WebTimeline prototype entered the repository.</p>\r
			<p>It could already place Boss events, player skills, and phase data on a horizontal timeline, but it was closer to a data viewer than an editor. Dense skills overlapped, Boss casts, damage checks, and end times competed for the same space, and the right-hand panel took too much room away from the main timeline.</p>\r
			<p>The first round of work did not add more pages. It established the information structure of the main screen. Instead of separating tracks by data source such as imported, manual, or ACR, the timeline is now organized by purpose.</p>\r
			<ul>\r
				<li>Boss casts and damage</li>\r
				<li>Opener</li>\r
				<li>Damage timeline</li>\r
				<li>Mitigation and healing</li>\r
				<li>Burst</li>\r
				<li>QT controls</li>\r
				<li>ACR simulation</li>\r
				<li>Watched skills</li>\r
			</ul>\r
			<p>The source is still shown, but only as a label and visual style. The editor's important question is “what does this skill do?”, not “which code path produced it?”</p>\r
			<p>The timeline also gained a full-fight view and P1 through P5 switching. Each phase has its own time range. Skills display relative time inside a phase while the data model stores absolute fight time. That constraint later became the basis for dragging: a P3 skill may move within P3 but cannot drift into a neighboring phase.</p>\r
\r
			<h2>Stage Two: Support Real PromeRotation Timelines</h2>\r
			<p>The first major issue appeared as soon as real user files were imported: “timeline JSON” does not have a single structure.</p>\r
			<p>The project currently handles three kinds of data.</p>\r
			<ol>\r
				<li>Traditional PromeRotation trigger timelines.</li>\r
				<li>PTL timelines.</li>\r
				<li>WebTimeline's own project format.</li>\r
			</ol>\r
			<p>A traditional trigger timeline contains Meta, Root, trigger conditions, parallel branches, and action nodes. PTL depends more heavily on anchors, offsets, and phase structure. Recursively flattening both formats may produce something visible while placing every event at the wrong time. In particular, a technical PTL anchor does not always equal the phase boundary the user sees.</p>\r
			<p>The import layer was therefore split into two steps: identify the format, then normalize it into internal editor events. Each event contains at least a skill ID, name, time, phase, category, source, duration, and target. Missing fields receive defaults, and an unknown job or ACR does not prevent basic browsing.</p>\r
			<p>Export keeps two paths.</p>\r
			<ul>\r
				<li>Export a native PromeRotation timeline while preserving imported Meta, Root, or original PTL content wherever possible.</li>\r
				<li>Export a WebTimeline project that retains the complete editing state for later work.</li>\r
			</ul>\r
			<p>The central rule is that a round trip must not lose data. WebTimeline cannot merely ingest a file; it has to return an edited result safely to the original workflow.</p>\r
\r
			<h2>Stage Three: Turn the Browser into a Real Editor</h2>\r
			<p>Once the timeline was visible, the next problem was preventing accidental edits.</p>\r
			<p>WebTimeline opens in browse mode. Skills cannot be dragged, and clicking one only shows details or locates it in the right-hand overview. In edit mode, manual skills and editable imported events unlock, while Boss skills and automatically simulated ACR skills remain locked.</p>\r
			<p>This distinction sounds small, but almost every interaction must obey it: drag listeners, delete buttons, time inputs, the skill insertion panel, and the target selector.</p>\r
\r
			<h3>Floating Skill Insertion Panel</h3>\r
			<p>Skill insertion became a floating tool enabled only in edit mode. The panel can move so it does not cover the phase being edited. Its library shows only skills relevant to the current job and groups them into all, damage, mitigation, tincture, 60-second burst, 120-second burst, and QT.</p>\r
			<p>Direct skill-ID input remains available, but users no longer have to repeat the skill name. A valid ID automatically resolves to its database name and icon.</p>\r
\r
			<h3>Dragging Is Not Just Changing a left Value</h3>\r
			<p>The drag interaction was rewritten several times.</p>\r
			<p>The first implementation used native browser drag and drop, which was unstable for long mitigation bars. Re-rendering the entire timeline during a drag also made horizontal scroll jump. I later added a Pointer Events path and moved high-frequency guide updates into <code>requestAnimationFrame</code>. The current track and time-conversion context are cached when dragging begins. During movement, only the guide line, time bubble, and differences from nearby events update; data is committed after release.</p>\r
			<p>Dragging a skill now shows several pieces of feedback at once.</p>\r
			<ul>\r
				<li>The exact proposed drop time.</li>\r
				<li>The difference in seconds from nearby skills.</li>\r
				<li>The allowed boundaries of the current phase.</li>\r
				<li>Whether the current track accepts this kind of skill.</li>\r
			</ul>\r
			<p>It feels closer to editing video than guessing a percentage position.</p>\r
\r
			<h3>Cooldown Validation Must Match Game Logic</h3>\r
			<p>Dragging alone is not enough. If a user can insert a skill before its cooldown is ready, the resulting timeline is meaningless.</p>\r
			<p>WebTimeline checks the queue using skill ID, shared cooldown key, charges, and recast time. An invalid insertion reports a conflict or moves a manual skill to its next usable time. When validating an existing event, the system must exclude the skill currently being moved. A future use of the same skill must not incorrectly prevent the current one from moving earlier.</p>\r
			<p>The opener also participates in the cooldown baseline. Otherwise, a skill used during the countdown or pull is incorrectly considered ready at the start of P1. These issues do not crash the page, but they destroy trust in the entire timeline, so I added dedicated regression tests.</p>\r
\r
			<h2>Stage Four: Mitigation Has a Target as Well as a Time</h2>\r
			<p>Damage skills can usually default to the Boss, but mitigation, healing, invulnerability, and support skills cannot.</p>\r
			<p>A self-targeted invulnerability, single-target mitigation for a teammate, and Reprisal targeting the Boss may all appear in the mitigation track but follow completely different target rules. WebTimeline therefore made the target a first-class event field.</p>\r
			<ul>\r
				<li>Attack skills target the Boss by default.</li>\r
				<li>Mitigation, healing, and invulnerability require target confirmation.</li>\r
				<li>Support mitigation cannot target the Boss.</li>\r
				<li>Imported mitigation can have its target edited in the details panel.</li>\r
			</ul>\r
			<p>After a target-dependent skill is dropped, a selector follows the newly placed event. To avoid being clipped by the timeline container, it became a fixed-position overlay, while horizontal scroll is retained across re-renders.</p>\r
			<p>It is a small interface, but it connects import, editing, categorization, and final export. Without it, the time may be correct while the execution target is still wrong.</p>\r
\r
			<h2>Stage Five: Bring in ACR Data</h2>\r
			<p>WebTimeline is not another skill table independent of PromeRotation. It needs to understand the selected job and ACR.</p>\r
			<p>The data pipeline reads PromeRotation source code, player-uploaded ACR packages, and necessary parse artifacts, then generates an ACR database for the frontend. It records jobs, ACR names, authors, support status, skills, QT controls, and generation time.</p>\r
			<p>With that data, the editor can:</p>\r
			<ul>\r
				<li>Detect the job and ACR from an imported timeline.</li>\r
				<li>Provide a skill insertion list for the current job.</li>\r
				<li>Generate an ACR simulation when no handwritten damage timeline exists.</li>\r
				<li>Discover QT controls from an ACR instead of hard-coding one author's implementation.</li>\r
				<li>Distinguish simulated, imported, and manual events.</li>\r
			</ul>\r
			<p>QT controls were initially scattered across damage and burst tracks. They later moved into a dedicated track. QT states near the same time collapse into one icon; clicking it reveals the individual switches without filling a row with repeated controls.</p>\r
			<p>The 60- and 120-second bursts are no longer settings outside the page. They participate in the main timeline as burst packages. New users see start time, skill count, and source; detailed users can expand the internal skills.</p>\r
\r
			<h2>Stage Six: Watching, Tracking, and the Full-Page Overview</h2>\r
			<p>Watching a skill and locating a skill were once mixed together.</p>\r
			<p>They are now two distinct operations.</p>\r
			<ul>\r
				<li>A watched skill belongs to a persistent list that summarizes every occurrence and source across the timeline.</li>\r
				<li>Tracking is a one-time location action. Clicking a skill on the right highlights it on the main timeline; clicking a timeline skill expands the corresponding event in the overview.</li>\r
			</ul>\r
			<p>The right panel now handles browsing and tracking only, not insertion. It became a full-page overview where Boss, opener, damage, mitigation, burst, and QT sections can collapse. While viewing one phase, tracking searches that phase first instead of unexpectedly jumping to the full-fight view.</p>\r
			<p>Track visibility controls were also added to the left side. Users can temporarily hide Boss, damage, mitigation, or burst bars and leave space for the content they are checking.</p>\r
\r
			<h2>Stage Seven: Expand from One Ultimate to More Boss Baselines</h2>\r
			<p>The first stage of WebTimeline focused on the initial Ultimate encounter. As the editor stabilized, baseline Boss data expanded to more Ultimate raids. It now includes basic timelines for the original encounter, Unending Coil, The Epic of Alexander, Dragonsong's Reprise, and Futures Rewritten.</p>\r
			<p>Most of this data comes from FFLogs combat events, but collecting events does not automatically produce a correct baseline.</p>\r
			<p>The first version only matched Boss casts with corresponding damage packets, which missed two important event types.</p>\r
			<ol>\r
				<li>Boss abilities that deal damage without a matching cast.</li>\r
				<li>Actions or stationary markers with no damage value that still determine mechanic timing.</li>\r
			</ol>\r
			<p>The current builder merges three record types.</p>\r
			<ul>\r
				<li>Events produced by matching casts with release damage.</li>\r
				<li>Boss damage events with no matching cast.</li>\r
				<li>Zero-damage markers that still matter to the mechanic timeline.</li>\r
			</ul>\r
			<p>It also filters auto-attacks, aggregated DoTs, purely visual actions, friendly sources, and obvious noise. New ability names enter a local Chinese mapping so the timeline does not mix untranslated English names into the data.</p>\r
			<p>Boss portraits follow a conservative rule: show one only when the project has the correct asset. New encounters without portraits do not reuse an unrelated Boss image as a placeholder; they wait for the proper material.</p>\r
\r
			<h2>Stage Eight: Move the UI from Feature-Complete to Sustainable</h2>\r
			<p>WebTimeline's interface has been rebuilt more than once.</p>\r
			<p>The early page was heavily divided. Left navigation, right tools, and top information each consumed space while the editor itself became narrow. Large explanatory cards were gradually removed. Import, export, job, ACR, mode, and encounter data moved into one light toolbar; the left side keeps lightweight track icons, and the right side keeps only the full-page overview.</p>\r
			<p>The current design uses a warm light background, thin borders, restrained corner radii, and subtle shadows, taking cues from tools such as Claude and Anthropic. It is not intended as a poster. It lets a user stare at hundreds of time points and still understand hierarchy.</p>\r
			<p>Several unremarkable-looking details required repeated adjustment.</p>\r
			<ul>\r
				<li>Boss cast, release, damage, and end information must not cover one another.</li>\r
				<li>Duration-based mitigation remains proportional to real time without stretching its text.</li>\r
				<li>Events at the end of P5 are clipped to track boundaries rather than protruding from the container.</li>\r
				<li>Player skills close in time receive visual staggering instead of collapsing into one card.</li>\r
				<li>The mini navigation bar remains visible instead of requiring a trip to the bottom of a long timeline.</li>\r
				<li>Narrow screens allow horizontal browsing without crushing buttons and text into unreadable widths.</li>\r
			</ul>\r
			<p>These changes are difficult to summarize as one major feature, but they determine whether the editor is a demo or a tool that can be used every day.</p>\r
\r
			<h2>Testing and Deployment</h2>\r
			<p>Many timeline-editor bugs look approximately right while storing the wrong data. The project therefore accumulated regression tests around real behavior.</p>\r
			<ul>\r
				<li>Traditional trigger and PTL format detection.</li>\r
				<li>Phase anchors and relative-to-absolute time conversion.</li>\r
				<li>Data retention across import and export.</li>\r
				<li>Isolation between edit and browse modes.</li>\r
				<li>Pointer dragging, scroll retention, and placement guides.</li>\r
				<li>Cooldown conflicts and opener baselines.</li>\r
				<li>Mitigation categories, target restrictions, and target selection.</li>\r
				<li>ACR simulation, QT controls, and burst packages.</li>\r
				<li>Boss casts, damage, zero-damage mechanic markers, and localized names.</li>\r
				<li>Right-side tracking, reverse location, and watched-skill summaries.</li>\r
				<li>Timeline boundaries, card overlap prevention, and responsive layout.</li>\r
			</ul>\r
			<p>At the time of writing, all 286 tests pass, as does the static build. The site is statically deployed to Cloudflare Pages with separate home and editor entry points. Core data is generated at build time, so the browser does not need to store private API credentials.</p>\r
\r
			<h2>The Most Important Lessons from This Work</h2>\r
			<h3>1. A Timeline Editor Is First a Data Converter</h3>\r
			<p>Dragging is only the surface. The difficult part is preserving meaning among PR, PTL, ACR, Boss events, and WebTimeline's internal model. If phase, target, or source is lost, a polished interface cannot recover it.</p>\r
			<h3>2. Source Should Not Be the Main Category</h3>\r
			<p>Manual, imported, and simulated are useful labels, but they should not become three unrelated timelines. The user is editing a battle plan, not a data pipeline.</p>\r
			<h3>3. Editing Freedom Must Respect Game Rules</h3>\r
			<p>The editor may let skills move freely, but it cannot allow impossible cooldowns, invalid targets, or cross-phase drift. A trustworthy constraint is more valuable than a canvas that permits everything.</p>\r
			<h3>4. Real Samples Are More Complex Than Imagined Formats</h3>\r
			<p>Dark Knight timelines, White Mage timelines, PTL, player ACR packages, and FFLogs Boss events repeatedly exposed edge cases. Every fix should leave a sample and a test, or the next UI change will bring old failures back.</p>\r
			<h3>5. Interface Space Is Itself a Feature</h3>\r
			<p>The longer the timeline, the more valuable the editor area becomes. Every sidebar, explanation box, and large heading takes space away from comparing skills. The final interface should quietly support the data rather than compete for attention.</p>\r
\r
			<h2>Where It Is Now</h2>\r
			<p>WebTimeline now has a usable core loop.</p>\r
			<div data-code-ref="0"></div>\r
			<p>It is still early. ACT and FFLogs comparison, damage estimates, broader job and ACR support, versioned local storage, shareable presentation pages, mobile support, and eight-player collaboration remain a long way off.</p>\r
			<p>The next stage will continue to prioritize data trustworthiness: complete more Ultimate skills and localized names, improve ACR simulation across jobs, keep validating PTL and traditional round trips, and make mitigation, QT, and burst editing better match what the plugin actually executes.</p>\r
\r
			<h2>Closing Thoughts</h2>\r
			<p>WebTimeline began with a simple thought: if a timeline is just “do this at this time,” why can it not be arranged like a video edit?</p>\r
			<p>The further development goes, the more certain I am that visualization is not a pretty shell over a complex system. Its real job is to turn rules hidden in JSON, trigger conditions, and author experience into something a user can observe, understand, and change.</p>\r
			<p>The first version is far from finished, but the path from “import a timeline I cannot understand” to “drag it in the browser, validate it, and return it to the plugin” is now connected.</p>\r
			<p>The next step is to keep refining it into a tool people genuinely want to use for writing timelines.</p>\r
`;export{e as default};