var e=`\r
			<p>This post records the process of developing the KANO Dark Knight ACR over the last few days.</p>\r
			<p>It is not just a showcase. It is a teaching-oriented development note about what an ACR needs to consider: basic rotation, burst logic, QT switches, a Hotkey panel, settings persistence, resource files, and finally packaging the project into a subscription repository format.</p>\r
			<p>Some behavior was aligned by observing mature implementations and public material. I will not go into concrete reverse-engineering details here. The valuable part is the second half: turning observed ideas into a project that is maintainable, debuggable, and publishable.</p>\r
\r
			<h2>Development Goals</h2>\r
			<p>KANO started with a direct goal: build a level 100 Dark Knight rotation.</p>\r
			<p>Once the work began, it became clear that a long-term usable ACR cannot merely press skills in order. It has to solve at least these problems:</p>\r
			<ul>\r
				<li>Separate high-end mode from daily mode.</li>\r
				<li>Align the level 100 burst with the standard rotation as much as possible.</li>\r
				<li>Trigger the 60-second and 120-second burst windows reliably.</li>\r
				<li>Prevent GCD and oGCD weaving from blocking each other.</li>\r
				<li>Let QT switches control rotation details.</li>\r
				<li>Let Hotkeys prioritize mitigation, provoke, Blackest Night, Oblation, and similar actions.</li>\r
				<li>Make the UI understandable, draggable, and able to save its position.</li>\r
				<li>Persist settings instead of resetting them whenever the plugin restarts.</li>\r
				<li>Ship resource files together with the DLL, without relying on local absolute paths.</li>\r
				<li>Package everything into a format that a subscription repository can read.</li>\r
			</ul>\r
			<p>So the project became a complete ACR development example that covers combat decisions, UI, settings, resources, packaging, and release.</p>\r
\r
			<h2>Overall Architecture</h2>\r
			<p>I ended up with a clear layered structure.</p>\r
			<div data-code-ref="0"></div>\r
			<p>Each layer has one job.</p>\r
			<p><code>KanoRotation</code> is the ACR entry point. It registers GCD and oGCD resolvers and handles opener state, events, UI activation, and combat state.</p>\r
			<p><code>DrkGcdResolver</code> only decides the next GCD.</p>\r
			<p><code>DrkOffGcdResolver</code> only decides the next ability.</p>\r
			<p><code>DrkAeLogic</code> contains the real job logic: whether to enter burst, spend MP, summon Fray, use Shadowbringer, use AOE in daily mode, or trigger automatic mitigation.</p>\r
			<p><code>ApiHelper</code> is my wrapper around the PR API. If the framework API changes later, I can change the helper instead of scattering framework calls everywhere.</p>\r
			<p>The key idea is this: do not put every decision into a Resolver. A Resolver should behave like a dispatcher. The actual rules should live in the logic layer.</p>\r
\r
			<h2>Entry Class: Wiring Only</h2>\r
			<p>An ACR entry class usually implements <code>IRotation</code> and uses <code>RotationMetadata</code> to describe job, author, version, and scope.</p>\r
			<p>A simplified version looks like this:</p>\r
			<div data-code-ref="1"></div>\r
			<p>The important part is keeping <code>NextGcd</code> and <code>NextOffGcd</code> separate.</p>\r
			<p><code>NextGcd</code> returns the next GCD.</p>\r
			<p><code>NextOffGcd</code> returns the next ability.</p>\r
			<p>A large part of Dark Knight rotation quality depends on stable oGCD weaving. If both paths are mixed together, debugging becomes painful.</p>\r
\r
			<h2>Why GCD and oGCD Must Be Split</h2>\r
			<p>When the rotation first broke, a common symptom was that GCD combos kept running while abilities never weaved, or the rotation claimed to be in burst but did not actually execute burst abilities.</p>\r
			<p>This is usually not a wrong skill ID. It is scheduling logic.</p>\r
			<p>FFXIV combat timing roughly works like this:</p>\r
			<ul>\r
				<li>Abilities can be woven while the GCD is rolling.</li>\r
				<li>Normally one GCD interval can fit up to two weaves.</li>\r
				<li>If ability checks are too conservative, nothing gets woven.</li>\r
				<li>If they are too aggressive, they clip the GCD.</li>\r
			</ul>\r
			<p>So oGCD logic should not be “use it when cooldown is ready.” It should be: the cooldown is ready, and the current window is suitable for weaving.</p>\r
			<div data-code-ref="2"></div>\r
			<p>The real project has more conditions, including queue state, movement, target, resources, and switch state. The principle stays the same: first decide whether a weave is possible, then decide what to weave.</p>\r
\r
			<h2>The Resource View of Dark Knight</h2>\r
			<p>Dark Knight is not just about pressing the skill that lights up.</p>\r
			<p>It manages several resources and windows:</p>\r
			<ul>\r
				<li>MP</li>\r
				<li>Blood gauge</li>\r
				<li>Darkside duration</li>\r
				<li>Blood Weapon / Delirium</li>\r
				<li>Fray window</li>\r
				<li>60-second burst</li>\r
				<li>120-second burst</li>\r
				<li>Shadowbringer charges</li>\r
				<li>Salted Earth and Salt and Darkness</li>\r
			</ul>\r
			<p>The rotation must first answer one question: what phase am I in right now?</p>\r
			<div data-code-ref="3"></div>\r
			<p><code>Living Shadow</code> should not be blocked by normal resource-spending logic. It needs a clear priority inside burst logic.</p>\r
			<div data-code-ref="4"></div>\r
			<p>The MP threshold cannot be hard-coded. High-end mode cares about burst, Blackest Night, and resource pooling. Daily mode cares more about comfort, uptime, and handling packs.</p>\r
\r
			<h2>Burst Logic: Define the Window, Then Order Priority</h2>\r
			<p>Dark Knight burst needs to fit these actions reliably:</p>\r
			<ul>\r
				<li>Blood Weapon / Delirium</li>\r
				<li>Fray</li>\r
				<li>Shadowbringer</li>\r
				<li>Salted Earth</li>\r
				<li>Salt and Darkness</li>\r
				<li>Carve and Spit / Abyssal Drain</li>\r
				<li>MP spending</li>\r
				<li>Bloodspiller / Quietus</li>\r
				<li>Fray follow-up</li>\r
			</ul>\r
			<p>I hit a classic issue: the opener 120-second burst showed as active, but abilities were not being used.</p>\r
			<ol>\r
				<li>Identify the opener window separately.</li>\r
				<li>Write shared burst conditions separately.</li>\r
				<li>Order Fray, Delirium, Shadowbringer, Salted Earth, and similar actions by priority.</li>\r
				<li>Make MP spending aware of when to dump everything and when to keep MP for Blackest Night.</li>\r
				<li>Let QT override default behavior.</li>\r
			</ol>\r
			<div data-code-ref="5"></div>\r
			<p>Priority matters. In a 120-second window, Shadowbringer and MP spending may both be available, but they are not the same kind of resource. Shadowbringer is a key burst action; MP spending is a dump. The order should be tuned through logs, not guesswork.</p>\r
\r
			<h2>QT: Buttons Must Actually Affect the Rotation</h2>\r
			<p>I kept a practical set of QT switches:</p>\r
			<ul>\r
				<li>Blood Weapon / Delirium</li>\r
				<li>Fray</li>\r
				<li>Shadowbringer</li>\r
				<li>Salted Earth</li>\r
				<li>Carve / Abyssal</li>\r
				<li>MP spending</li>\r
				<li>Follow-up, DoT, AOE, resource holding, potion, forced AOE, pause</li>\r
				<li>Daily-mode automatic mitigation, automatic provoke, and pull mode</li>\r
			</ul>\r
			<p>The point of QT is not to display a button. It is to change the rotation for real.</p>\r
			<div data-code-ref="6"></div>\r
			<p>One QT should control one category of behavior. If a button affects too many things, later debugging becomes guesswork.</p>\r
\r
			<h2>Do Not Force High-End and Daily Modes Together</h2>\r
			<p>High-end and daily mode optimize for different things.</p>\r
			<p>High-end mode wants burst alignment, stable resource pooling, isolation from daily pull logic, timeline mitigation, and a stable opener.</p>\r
			<p>Daily mode wants automatic AOE, pulls, mitigation, low-level compatibility, and comfortable behavior without idle gaps.</p>\r
			<div data-code-ref="7"></div>\r
			<div data-code-ref="8"></div>\r
			<p>Do not try to cover both with one logic path. Their goals differ, and forcing them together makes them fight each other.</p>\r
\r
			<h2>Automatic Mitigation: Simple Looking, Debug Heavy</h2>\r
			<p>Daily automatic mitigation has to check mode, QT state, combat state, nearby enemies, player HP, boss casts, current aggro, mitigation spacing, and whether enemies are about to die.</p>\r
			<div data-code-ref="9"></div>\r
			<p>Automatic mitigation needs Debug output. Without it, you cannot tell why it did not trigger.</p>\r
			<div data-code-ref="10"></div>\r
			<p>This is much more useful than staring at the game and asking why a mitigation did not happen.</p>\r
\r
			<h2>Hotkey Panel: Do Not Hard-Code Skill Logic in the UI</h2>\r
			<p>Hotkey support is an important part of KANO. I made it a floating window rather than a plain button list: click to cast, dim on cooldown, show cooldown and charges, support second-party Blackest Night / Oblation, Living Dead, LB, Provoke, Shirk, knockback prevention, stance toggle, bundled icons, drag ordering, and position persistence.</p>\r
			<div data-code-ref="11"></div>\r
			<p>On click, the UI should not contain skill logic directly. It should delegate to <code>Logic.OnClick()</code>.</p>\r
			<div data-code-ref="12"></div>\r
			<p>That keeps “self target,” “party slot 2,” “stance toggle,” and “LB” as separate logic classes instead of a tangled UI file.</p>\r
\r
			<h2>Custom QT UI: Separate Drawing from State</h2>\r
			<p>I started with PR’s built-in QT, but it did not give enough visual control. Later I built KANO’s own QT floating window.</p>\r
			<p>The benefits are full style control, custom button rows, the ability to hide the built-in QT, and a unified look with Hotkey and control panels.</p>\r
			<div data-code-ref="13"></div>\r
			<p>The pattern is: draw appearance with <code>drawList</code>, use <code>InvisibleButton</code> for the clickable area, read state from QT, and write state back after clicks. UI should display and modify state, not decide combat logic.</p>\r
\r
			<h2>Settings Persistence: Do Not Write to Temporary Directories</h2>\r
			<p>Settings persistence is easy to forget, but it affects the experience a lot. KANO needs to save mode, QT defaults, Hotkey order, window positions, opener countdown, MP thresholds, and mitigation thresholds.</p>\r
			<div data-code-ref="14"></div>\r
			<p>The trap I hit was saving into PR’s temporary cache directory.</p>\r
			<div data-code-ref="15"></div>\r
			<p>When the process ID changes after restart, the settings look lost. The stable approach is to save into the plugin config directory.</p>\r
			<div data-code-ref="16"></div>\r
			<p>That makes the settings persist on each user’s machine without hard-coding my username or depending on a process-specific folder.</p>\r
\r
			<h2>Resource Publishing: Do Not Depend on Local Absolute Paths</h2>\r
			<p>Hotkey icons can be tested from a local absolute path, but release builds must include them in the project.</p>\r
			<div data-code-ref="17"></div>\r
			<div data-code-ref="18"></div>\r
			<div data-code-ref="19"></div>\r
			<p>With this layout, icons still render correctly after someone else downloads the plugin.</p>\r
\r
			<h2>Timeline Integration: Node Semantics Matter</h2>\r
			<p>I also experimented with timeline integration. One category triggers skills, such as mitigation timelines. Another category controls QT, such as enabling “keep MP for Blackest Night during burst” for a phase.</p>\r
			<div data-code-ref="20"></div>\r
			<p>The important detail is that timeline action nodes must mean something the runtime can execute. A label is not enough. The node has to bind to an action that ACR / PR recognizes.</p>\r
			<p>A timeline is not just JSON conversion. Node semantics must match executable runtime behavior.</p>\r
\r
			<h2>Debugging Methods</h2>\r
			<p>Debugging is the heart of ACR development. I used these methods:</p>\r
			<ol>\r
				<li>Watch the next GCD / oGCD in game.</li>\r
				<li>Print current state in a development panel.</li>\r
				<li>Test on a dummy.</li>\r
				<li>Compare skill counts through ACT / FFLogs.</li>\r
				<li>Compare 60-second and 120-second windows with mature implementations.</li>\r
				<li>Build and copy directly into the PR ACR directory for testing.</li>\r
			</ol>\r
			<div data-code-ref="21"></div>\r
			<p>This is much more useful than “the skill did not fire.” Any condition that can return <code>false</code> should be able to explain why it returned <code>false</code>.</p>\r
\r
			<h2>Packaging and GitHub Release</h2>\r
			<p>A PR ACR subscription generally needs <code>KANO.zip</code>, <code>repo.json</code>, and a GitHub Release.</p>\r
			<div data-code-ref="22"></div>\r
			<ol>\r
				<li><code>dotnet build -c Release</code></li>\r
				<li>Put <code>KANO.dll</code>, <code>KANO.deps.json</code>, and <code>Resources</code> into a temporary package folder.</li>\r
				<li>Compress it into <code>KANO.zip</code>.</li>\r
				<li>Calculate SHA256.</li>\r
				<li>Update <code>repo.json</code>.</li>\r
				<li>Upload to GitHub Release.</li>\r
			</ol>\r
			<div data-code-ref="23"></div>\r
			<div data-code-ref="24"></div>\r
			<p><code>repo.json</code> should preferably be UTF-8 without BOM to avoid parser surprises.</p>\r
\r
			<h2>Key Lessons</h2>\r
			<ol>\r
				<li>Write a working rotation before making the UI pretty.</li>\r
				<li>Every complex decision should explain itself.</li>\r
				<li>More QT switches are not always better. Each one needs a clear purpose.</li>\r
				<li>Separate high-end and daily mode. One wants strictness; the other wants comfort.</li>\r
				<li>Do not depend on local paths. Icons, settings, and release files must work on other machines.</li>\r
				<li>When learning from mature implementations, learn behavior rather than copying code.</li>\r
			</ol>\r
\r
			<h2>What Could Come Next</h2>\r
			<p>KANO could add a combat analysis panel, automatic mitigation Debug, 120 / 60 burst status lights, timeline QT control nodes, config import and export, better low-level daily support, FFLogs comparison helpers, and a one-click release script.</p>\r
			<p>If I continue, I would add the combat analysis panel first. It can directly show whether Edge uses are missing, whether Shadowbringer was delayed, and whether MP was dumped inside the 120-second window. That saves a lot of time compared with reading combat logs by eye.</p>\r
\r
			<h2>Conclusion</h2>\r
			<p>The biggest lesson from building KANO is that writing an ACR is not simply arranging skills in order.</p>\r
			<p>It is a small combat decision system. It needs job knowledge, framework API knowledge, UI, settings, resources, release packaging, and constant feedback from real combat logs.</p>\r
			<p>Once the base structure is solid, every later optimization becomes easier. KANO has moved from “able to press skills” to “maintainable, debuggable, and publishable,” and that is the most valuable result of these few days of work.</p>\r
`;export{e as default};