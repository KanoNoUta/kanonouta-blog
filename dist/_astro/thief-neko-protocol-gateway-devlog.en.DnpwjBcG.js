var e=`\r
			<p>At the beginning, all I had was a batch of GLM-5.2 calls provided by Catpaw.</p>\r
			<p>My goal was straightforward: connect those calls to Claude Code so the model could do more than answer questions. It should be able to inspect a project, modify files, run commands, and finish an entire development task.</p>\r
			<p>I assumed a reverse proxy would be enough: forward requests from Claude Code to Catpaw, then return the response unchanged. Once I started, I found that although both sides were calling a large language model, they did not speak the same protocol language.</p>\r
			<p>That small proxy eventually grew into <strong>Thief Neko</strong>, a stateful protocol gateway that supports Anthropic Messages, OpenAI Chat Completions, and OpenAI Responses.</p>\r
			<p>This article is not only a record of what it does. It also tries to answer a more useful question: <strong>how do you tell whether an LLM gateway actually works, rather than merely returns text?</strong></p>\r
\r
			<h2>Define What “Working” Means First</h2>\r
			<p>When the gateway returned model text for the first time, I thought most of the work was done.</p>\r
			<p>The moment Claude Code entered a tool-calling flow, the problem became obvious. The model would say, “I will inspect the project,” print something that looked like an action plan, and stop. A Catpaw call had been consumed, but Claude Code had not executed anything.</p>\r
			<p>This showed that “the model replied” is only the weakest form of success. For an agent client, at least four things need to be verified in order.</p>\r
			<ol>\r
				<li>Ordinary text is returned correctly.</li>\r
				<li>The model emits a structured tool call instead of describing one in prose.</li>\r
				<li>After the client executes the tool, its result returns to the same conversation turn.</li>\r
				<li>The model continues from that result until it produces a final answer.</li>\r
			</ol>\r
			<p>I later defined the real minimum acceptance test as a complete tool loop.</p>\r
			<div data-code-ref="0"></div>\r
			<p>Only after this loop completed could I say that requests, tools, results, and conversation state were all connected.</p>\r
\r
			<h2>Why a Reverse Proxy Is Not Enough</h2>\r
			<p>Claude Code uses Anthropic Messages. Catpaw is closer to OpenAI Chat Completions combined with its own Agent conversation format. The difference is not just field names; it spans at least four layers.</p>\r
			<table>\r
				<thead><tr><th>Layer</th><th>What must be translated</th></tr></thead>\r
				<tbody>\r
					<tr><td>Messages</td><td><code>system</code>, <code>user</code>, <code>assistant</code>, content blocks, and multipart text</td></tr>\r
					<tr><td>Tools</td><td><code>tool_use</code>, <code>tool_result</code>, <code>tool_calls</code>, argument deltas, and finish reasons</td></tr>\r
					<tr><td>Streaming</td><td>OpenAI SSE chunks and Anthropic event sequences</td></tr>\r
					<tr><td>State</td><td><code>conversationId</code>, <code>suggestUuid</code>, workspace paths, history, and credentials</td></tr>\r
				</tbody>\r
			</table>\r
			<p>If you only handle the first layer, chat will usually work. The remaining problems arrive together as soon as tools, streaming, or long-running sessions are involved.</p>\r
			<p>That is why Thief Neko evolved toward this structure.</p>\r
			<div data-code-ref="1"></div>\r
			<p>The most important design choice was to establish a normalized intermediate representation first, then adapt each client and upstream service separately. Otherwise, every new protocol requires pairwise conversions with all existing protocols, and complexity grows rapidly.</p>\r
\r
			<h2>Step One: Do Not Flatten Structured Content into Text</h2>\r
			<p>A single Anthropic message can contain several content blocks. An assistant may emit text followed by a <code>tool_use</code>, while the next user turn returns the execution result in a <code>tool_result</code>.</p>\r
			<p>The central mappings into OpenAI format look like this.</p>\r
			<div data-code-ref="2"></div>\r
			<p>A simplified converter can be written as follows.</p>\r
			<div data-code-ref="3"></div>\r
			<p>Two details are easy to miss.</p>\r
			<p>First, the tool-call ID must be preserved exactly. The later tool result uses that ID to find its call; generating a new ID breaks the conversation on the next turn.</p>\r
			<p>Second, do not append a <code>tool_result</code> to ordinary user text. The model may still understand the words, but both the client and upstream service lose the structural fact that this is the result of a specific tool call.</p>\r
\r
			<h2>Step Two: Treat Tool Calls as a State Machine</h2>\r
			<p>A tool call is not an isolated JSON object. It is an ordered state transition.</p>\r
			<div data-code-ref="4"></div>\r
			<p>The gateway therefore needs to track at least the following information.</p>\r
			<ul>\r
				<li>Which conversation owns the current call.</li>\r
				<li>The tool-call ID, name, and arguments.</li>\r
				<li>Which call a tool result belongs to.</li>\r
				<li>Whether the turn ended normally or with <code>tool_calls</code> / <code>tool_use</code>.</li>\r
				<li>The <code>conversationId</code> and <code>suggestUuid</code> required by the upstream service on the next turn.</li>\r
			</ul>\r
			<p>The early implementation lacked this state. The model could express what it intended to do, but it could not hand execution over to the client.</p>\r
			<p>On the request side, I also added an explicit tool contract: when an action is needed, the model must use a function declared by the client and must not merely describe the action in text. The first request can require a tool; after a tool result arrives, the mode returns to <code>auto</code> so the model can either continue or finish.</p>\r
			<p>This is not an attempt to repair the protocol with prompting. It makes the model and translation layer follow the same contract. The gateway still validates the actual tool structure.</p>\r
\r
			<h2>Step Three: Rebuild SSE Events Instead of Renaming Fields</h2>\r
			<p>Streaming output was the second major trap.</p>\r
			<p>An OpenAI-style API usually keeps returning <code>choices[0].delta</code>. Anthropic expects a strict sequence of SSE events.</p>\r
			<div data-code-ref="5"></div>\r
			<p>Tool calls also need their own <code>content_block</code>, with arguments sent through <code>input_json_delta</code>. Renaming fields on OpenAI chunks is not enough for the client to understand them.</p>\r
			<p>Thief Neko therefore uses a stream builder. It gathers text, tool arguments, finish reasons, and token usage chunk by chunk, then emits events in the order Anthropic expects.</p>\r
			<p>There was another problem: some upstream streaming content was a cumulative snapshot rather than a delta.</p>\r
			<div data-code-ref="6"></div>\r
			<p>If all three chunks are forwarded as deltas, the client sees this.</p>\r
			<div data-code-ref="7"></div>\r
			<p>For this kind of stream, the gateway must first determine whether content is a snapshot or a delta. The simplest approach compares the common prefix of the previous and current chunks and emits only the new suffix. A real implementation must also handle repeated paragraphs, empty chunks, split tool arguments, and snapshots that move backward or rewrite earlier text.</p>\r
			<p>This is why streaming deserves its own state machine and bounded buffers. An unbounded “store it for now” strategy inevitably turns into a memory problem during long tasks.</p>\r
\r
			<h2>Step Four: Paths Are Part of the Protocol</h2>\r
			<p>Claude Code Desktop tools may run on the Windows host or inside the local Agent's virtual workspace. The same file can therefore have two paths.</p>\r
			<div data-code-ref="8"></div>\r
			<p>If a virtual path is given to host-side Read / Write / Edit, the file cannot be found. If a Windows path is given to a shell inside the virtual environment, that fails too.</p>\r
			<p>Path conversion cannot be a global string replacement. It must know where the tool runs.</p>\r
			<ul>\r
				<li>Native host file tools use real Windows paths.</li>\r
				<li>The virtual shell uses <code>/sessions/.../mnt/...</code> mount paths.</li>\r
				<li>When there is no exact mapping, inspect the current working directory and mounts instead of guessing.</li>\r
				<li>Do not rewrite shell command strings casually; quoting and escaping are easy to break.</li>\r
			</ul>\r
			<p>This taught me that protocol adaptation does not stop at HTTP. <strong>Whenever two ends represent the same thing differently, that representation is part of the protocol.</strong></p>\r
\r
			<h2>Step Five: Make Credential Refresh Single-Flight</h2>\r
			<p>After the gateway had been running for a while, Claude Code would occasionally report an invalid API key and log out. After checking Clash, IP changes, and service configuration, I confirmed that Catpaw login credentials refresh while the program is running.</p>\r
			<p>If the gateway still holds the old token, the upstream service returns 401. Claude Code interprets that as an invalid user-configured API key and interrupts the entire development session.</p>\r
			<p>The fix has three layers.</p>\r
			<ol>\r
				<li>Poll the login state and hot-swap a newly discovered token.</li>\r
				<li>On 401, refresh credentials and transparently retry once.</li>\r
				<li>When several requests receive 401 at the same time, allow only one refresh operation to run.</li>\r
			</ol>\r
			<p>The third point matters. Ten failed requests refreshing ten times wastes resources and can cause state to overwrite itself. The simplified single-flight logic looks like this.</p>\r
			<div data-code-ref="9"></div>\r
			<p>This also distinguishes two kinds of 401.</p>\r
			<ul>\r
				<li>If the failed request used an already outdated token, another request has refreshed it, so retry with the new token.</li>\r
				<li>Only start another refresh when the currently installed token is also rejected.</li>\r
			</ul>\r
			<p>If new credentials are temporarily unavailable, the gateway returns a temporary 503 instead of passing the upstream 401 through. A 503 means the service is temporarily unavailable and may be retried; a 401 tells the client that its persistent configuration is wrong. Correct error semantics are part of compatibility.</p>\r
			<p>The Windows version later stored login sessions with DPAPI. The Linux version uses AES-256-GCM encryption and exposes credentials to the gateway through an independent credential service. Thief Neko no longer needs the Catpaw desktop application to stay open.</p>\r
\r
			<h2>Step Six: Bound Every Piece of State in Long Tasks</h2>\r
			<p>A five-minute test passing does not mean an Agent task lasting one to three hours will remain stable.</p>\r
			<p>Long tasks amplify every unbounded data structure: session maps, tool-argument buffers, request history, stream buffers, activity lists, and log files. I gave every resource an explicit boundary.</p>\r
			<p>The current defaults are approximately as follows.</p>\r
			<table>\r
				<thead><tr><th>Resource</th><th>Default limit</th></tr></thead>\r
				<tbody>\r
					<tr><td>Agent sessions</td><td>128</td></tr>\r
					<tr><td>Session lifetime</td><td>6 hours</td></tr>\r
					<tr><td>Request body</td><td>10 MiB</td></tr>\r
					<tr><td>Conversation history</td><td>256 KiB</td></tr>\r
					<tr><td>Stream buffer</td><td>4 MiB</td></tr>\r
					<tr><td>Recent activity records</td><td>100</td></tr>\r
					<tr><td>Log files</td><td>10 MiB each, 3 retained</td></tr>\r
				</tbody>\r
			</table>\r
			<p>History compaction cannot simply delete the oldest message. A tool call and its result form a pair; deleting only one side leaves invalid history behind.</p>\r
			<p>Thief Neko uses these compaction rules.</p>\r
			<ul>\r
				<li>Keep the system instructions and initial task so the model does not forget its objective.</li>\r
				<li>Prefer the most recent complete tool calls and results.</li>\r
				<li>Keep or remove a tool pair as a unit.</li>\r
				<li>Retain only head and tail summaries for large tool results.</li>\r
				<li>Persist full output to disk so a tool can read it again when needed.</li>\r
			</ul>\r
			<p>This work does not add a visible feature, but it determines whether the gateway moves from “works in a demo” to “works every day.”</p>\r
\r
			<h2>Recognize Failure Instead of Retrying Forever</h2>\r
			<p>Long sessions exposed several recurring forms of degradation.</p>\r
			<ul>\r
				<li>A trailing backslash in a Windows path leaves tool-argument JSON incomplete.</li>\r
				<li>The model repeatedly retries the same invalid arguments.</li>\r
				<li>A tool object is accidentally serialized as <code>[object Object]</code>.</li>\r
				<li>The model remains in a read-only search loop and never modifies a file.</li>\r
				<li>A tool call appears as tags inside ordinary text.</li>\r
			</ul>\r
			<p>For example, the model occasionally emits this.</p>\r
			<div data-code-ref="10"></div>\r
			<p>It looks like a tool call, but it is ordinary text. Executing every similar pattern would also misclassify examples in a user's article or source code.</p>\r
			<p>The current recovery rule requires the tool name to be declared by the client, the argument tags to be complete, and the parsed structure to pass the tool schema. If any condition fails, the content remains text.</p>\r
			<p>Repeated failures also need a recovery budget. Since v0.2.3, Thief Neko may clear a bad turn and recover automatically only once. If the same class of error continues, it stops the local loop and returns the reason to the user. Infinite retries look active but only keep consuming calls.</p>\r
\r
			<h2>The Problem Line Behind Each Version</h2>\r
			<p>Looking back, each release addressed a new layer of reliability rather than an isolated bug.</p>\r
			<table>\r
				<thead><tr><th>Version</th><th>Problem addressed</th></tr></thead>\r
				<tbody>\r
					<tr><td>v0.1.0</td><td>Anthropic Messages, file tools, Windows paths, and the desktop controller</td></tr>\r
					<tr><td>v0.2.0</td><td>Independent login, Linux service, Responses, and New API integration</td></tr>\r
					<tr><td>v0.2.2</td><td>Namespaced shell arguments, trailing backslashes, and repeated-error detection</td></tr>\r
					<tr><td>v0.2.3</td><td>Bad-turn cleanup and bounded automatic recovery</td></tr>\r
					<tr><td>v0.2.4</td><td>Object serialization and persistent read-only search loops</td></tr>\r
					<tr><td>v0.2.5</td><td>Oversized-history compaction and truncated JSON repair</td></tr>\r
				</tbody>\r
			</table>\r
			<p>This sequence also suggests a more practical implementation order.</p>\r
			<ol>\r
				<li>Finish non-streaming text conversion first.</li>\r
				<li>Then complete one full tool-call loop.</li>\r
				<li>Implement streaming events and tool-argument deltas next.</li>\r
				<li>Add session, path, and credential state.</li>\r
				<li>Finally, use long-running tasks to find leaks and degraded loops.</li>\r
			</ol>\r
			<p>Trying to support every protocol and every client at once makes it hard to identify which layer failed. Adding one capability at a time keeps failures local and understandable.</p>\r
\r
			<h2>Test Contracts, Not Implementation Details</h2>\r
			<p>Thief Neko's current tests focus less on how many times a function was called and more on whether protocol output satisfies the client's contract.</p>\r
			<ul>\r
				<li>Can Anthropic messages be mapped correctly to OpenAI messages?</li>\r
				<li>Do <code>tool_use</code> and <code>tool_result</code> preserve their ID pairing?</li>\r
				<li>Is the streaming event sequence complete?</li>\r
				<li>Can split tool arguments be assembled into valid JSON?</li>\r
				<li>Do cumulative snapshots avoid producing duplicate text?</li>\r
				<li>Do concurrent 401 responses trigger only one credential refresh?</li>\r
				<li>Does exceeding request, history, or stream limits fail explicitly?</li>\r
				<li>Can the server complete a real tool loop?</li>\r
			</ul>\r
			<p>Local development starts with this command.</p>\r
			<div data-code-ref="11"></div>\r
			<p>After the automated tests, I still run an end-to-end task against a real workspace. Path mapping, desktop-client event ordering, and long-session recovery are difficult to cover completely with unit tests alone.</p>\r
			<p>A useful regression task should include Read, Write, Edit, shell, and a final result check. Asking “can you use tools?” and receiving “yes” proves nothing.</p>\r
\r
			<h2>What I Would Do Earlier If I Started Again</h2>\r
			<p>First, draw the protocol state diagram before writing converters. Message structures look simple, but tools, streams, and sessions quickly turn ad hoc conditionals into an unmanageable system.</p>\r
			<p>Second, assign every request an ID that spans the whole path. Logs should connect the client request, upstream conversation, tool calls, and retries while redacting tokens, cookies, and tool output.</p>\r
			<p>Third, save failure samples from day one. One real broken SSE chunk is usually worth more than ten guesses. Once anonymized and turned into a fixture, it prevents the same fix from regressing in the next version.</p>\r
			<p>Fourth, define a recovery budget. Every automatic repair should answer three questions: how many retries are allowed, which state may be discarded, and when the system must stop.</p>\r
			<p>Fifth, begin long-duration tests early. The hardest gateway bugs rarely happen on the first turn. They appear after dozens of tool calls, during the first token refresh, or when history approaches its limit.</p>\r
\r
			<h2>What I Understand Now</h2>\r
			<p>Looking back, Thief Neko is no longer a reverse proxy in the traditional sense. It is a stateful protocol translator that maintains both the structural contracts of several APIs and the semantic continuity of an Agent conversation.</p>\r
			<p>The hard part is not renaming field A to field B. It is always knowing which tool is running, which turn owns a result, when to continue, when recovery is safe, and when the gateway must stop.</p>\r
			<p>Making a model “reply” is easy. Making it reliably “finish the work” across different clients, protocols, and execution environments is the real problem this project solves.</p>\r
			<p>Project: <a href="https://github.com/KanoNoUta/thief-neko">KanoNoUta/thief-neko</a></p>\r
`;export{e as default};