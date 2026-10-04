var e=`\r
			<blockquote><p>Ruri is still a development-stage plugin for FFXIV China 7.51 and Dalamud CN API 15. This article covers solver design, offline simulation, and automated verification. I will not describe anything that still lacks real-client validation as stable.</p></blockquote>\r
\r
			<p>This work did not begin with a plan to implement an impressive algorithm.</p>\r
			<p>It began with a rather foolish error.</p>\r
			<p>I was asking Ruri to craft Recipe 37825. The character had 664 CP, the progress target was 10040, and maximum quality was 21200. The old solver stopped on the very first step with this result:</p>\r
			<div data-code-ref="0"></div>\r
			<p>The message gives itself away. It says the optimistic quality ceiling is far above the target, then declares the target unreachable in the same breath.</p>\r
			<p>The old logic first searched for a conservative finish path that guaranteed progress only. Naturally, that path did not perform quality actions, so its final quality was zero. The program then confused “this finish path gains no quality” with “no possible path can gain enough quality” and returned before the real quality search even began.</p>\r
			<p>That bug forced me to revisit a deceptively simple question: <strong>what is a crafting solver actually solving?</strong></p>\r
			<p>The answer is not a fixed list of actions. It is a path through a state space with limited resources, complicated rules, and changing conditions, where progress must finish and the requested quality target must also be met.</p>\r
			<p>That led me to study <a href="https://github.com/KonaeAkira/raphael-rs">Raphael</a> in earnest. The most interesting part was not that it could generate a macro. It was the clarity with which it turned FFXIV crafting into a search problem.</p>\r
			<p>This article focuses on Raphael's algorithmic structure and then explains how I brought some of those ideas into Ruri. The boundary matters: Ruri currently implements a <strong>Raphael-inspired bounded global search</strong>. It is not a line-by-line port of <code>raphael-rs</code>, and it does not yet have Raphael's strict global-optimality guarantees.</p>\r
\r
			<h2>Start by Writing Crafting as State</h2>\r
			<p>A player sees durability, CP, progress, and quality. A solver has to see considerably more.</p>\r
			<div data-code-ref="1"></div>\r
			<p>Every action moves the craft along an edge into a new state:</p>\r
			<div data-code-ref="2"></div>\r
			<p>If the action and current condition are deterministic, the outcome is deterministic as well. An action with a success rate, or a next condition expanded by probability, produces several transition branches.</p>\r
			<p>The complete craft can therefore be viewed as a directed graph:</p>\r
			<div data-code-ref="3"></div>\r
			<p>The objective is not one score either. It is a set of lexicographically ordered constraints:</p>\r
			<ol>\r
				<li>The craft must finish. A plan with incomplete progress is not useful.</li>\r
				<li>The plan must meet the HQ or collectable quality threshold.</li>\r
				<li>Only after those constraints are satisfied do quality, steps, duration, and remaining resources become tie-breakers.</li>\r
			</ol>\r
			<p>This ordering matters. A little more quality cannot justify a path that eventually fails to finish, and a state that merely looks close to the goal is not a success.</p>\r
\r
			<h2>Work Through a Four-Step Example by Hand</h2>\r
			<p>Forget the dozens of real game actions for a moment and keep only three fictional ones. The goal is 100 progress and 80 quality, starting with 30 durability and 36 CP.</p>\r
			<table><thead><tr><th>Action</th><th>Cost</th><th>Effect</th></tr></thead><tbody>\r
				<tr><td>Innovation</td><td>18 CP</td><td>Double the quality of the next Touch</td></tr>\r
				<tr><td>Touch</td><td>18 CP, 10 durability</td><td>Add 40 quality</td></tr>\r
				<tr><td>Synthesis</td><td>10 durability</td><td>Add 50 progress</td></tr>\r
			</tbody></table>\r
			<p>Two Touch actions look attractive if we only consider immediate gain. The state moves from <code>p=0, q=0, d=30, cp=36</code> to <code>p=0, q=80, d=10, cp=0</code>. Quality is complete, but there is durability for only one Synthesis, so progress can reach at most 50 and the craft must fail.</p>\r
			<p>The feasible path is <code>Innovation → Touch → Synthesis → Synthesis</code>. Innovation consumes no durability, the empowered Touch reaches 80 quality in one action, and the remaining 20 durability pays for two Synthesis actions. The terminal state is <code>p=100, q=80, d=0, cp=0</code>.</p>\r
			<p>This tiny example already contains three hard parts of the real problem:</p>\r
			<ol>\r
				<li>The action with the best local payoff may not belong to any globally feasible path.</li>\r
				<li>Quality and progress compete for the same durability and CP, so they cannot be solved as independent problems.</li>\r
				<li>After finding one feasible path, the solver must still decide whether a shorter or higher-quality path exists.</li>\r
			</ol>\r
			<p>Brute force can try every four-step combination here. A real recipe has more than twenty candidates, dozens of steps, and many buff states. Raphael's job is to keep hopeless combinations out of deep search without discarding the optimal path.</p>\r
\r
			<h2>Why Brute Force Is Not an Option</h2>\r
			<p>Suppose an average step offers 20 actions and a plan reaches a depth of 40. A naive upper bound on the search space is:</p>\r
			<div data-code-ref="4"></div>\r
			<p>The number is useless in practice. Level, CP, durability, and prerequisites remove many actions, but the remaining state space still expands extremely quickly.</p>\r
			<p>Different action orders can also reach states with the same effect context but different resources. If two states have identical buffs, condition, and combo context, while one has no less progress, quality, durability, or CP, continuing from the weaker state usually repeats work.</p>\r
			<p>The heart of a crafting solver is therefore not merely searching. It is <strong>proving as early as possible that a branch no longer deserves to be searched</strong>.</p>\r
			<p>Raphael does this by combining best-first search, branch-and-bound, dynamic programming, and Pareto optimization. Several specialized sub-solvers continuously provide upper and lower bounds to the main search.</p>\r
\r
			<h2>Raphael's Main Framework: A Shortest Path over a DAG</h2>\r
			<p>Raphael treats crafting states as nodes and legal actions as edges. Its main search expands the most promising node first instead of blindly following generation order.</p>\r
			<p>Let <code>A(s)</code> be the legal actions in state <code>s</code>, <code>T(s,a)</code> the state after action <code>a</code>, and <code>P*</code> and <code>Q*</code> the progress and quality targets. The best complete plan found so far is stored as the incumbent.</p>\r
			<p>For every unexpanded state, the sub-solvers provide an optimistic assessment: maximum reachable progress, maximum reachable quality, and minimum remaining steps. Optimistic means they may imagine a future better than reality, never worse. If even that optimistic future cannot beat the incumbent, the real continuation cannot beat it either and the branch is safe to remove.</p>\r
			<p>A deliberately simplified version looks like this:</p>\r
			<div data-code-ref="5"></div>\r
			<p><code>queue.popBest()</code> is best-first: inspect the theoretically strongest state first. Once a solution exists, restricting later work with the incumbent is branch-and-bound. An upper bound is the best fantasy a branch could achieve; the incumbent is the best result actually in hand. If the fantasy cannot beat the record, there is nothing left to search.</p>\r
			<p>Two conclusions must remain separate:</p>\r
			<ul>\r
				<li><strong>A feasible solution was found</strong>: at least one path satisfies progress and quality.</li>\r
				<li><strong>The optimal solution was proved</strong>: every unexpanded path has an optimistic bound no better than the incumbent.</li>\r
			</ul>\r
			<p>The first solution is not automatically optimal. If the time or node budget expires before the second statement is proved, the result is bounded, not exact optimal.</p>\r
			<p>The elegant part is not the loop itself. It is the set of small proof engines around it.</p>\r
\r
			<h2>FinishSolver: Can This State Still Finish?</h2>\r
			<p>No amount of quality matters if the remaining durability and CP can no longer fill the progress bar.</p>\r
			<p><code>FinishSolver</code> temporarily removes quality from the question and asks how much progress can theoretically still be produced from the current state.</p>\r
			<p>As a memoized recurrence, it can be written as <code>F(s) = max(Δprogress(s,a) + F(T(s,a)))</code>, where <code>a</code> ranges only over actions allowed in a finish. When the same remaining CP, durability, and progress context appears again, the cached <code>F(s)</code> is reused.</p>\r
			<p>If <code>state.progress + F(state) &lt; P*</code>, progress is insufficient even under the most favorable continuation. That is a proof of physical infeasibility. In the toy example, the second Touch leaves 10 durability, so <code>F(s)</code> is at most 50. Because <code>0 + 50 &lt; 100</code>, the greedy quality branch can be pruned immediately.</p>\r
			<p>For pruning to be safe, that estimate must be optimistic. It may assume that future progress actions are unusually efficient or that resources convert more generously than they do in a real rotation. What it must never do is underestimate the true maximum.</p>\r
			<ul>\r
				<li>An upper bound that is too high prunes fewer states and costs performance.</li>\r
				<li>An upper bound that is too low deletes a viable path and breaks correctness.</li>\r
			</ul>\r
			<p>Ruri's <code>ProgressFeasibilitySolver</code> follows the same rule. It deliberately overestimates durability recovery and Waste Not, and relaxes how many actions CP can buy. Only if the craft still cannot finish under that generous model may it be called physically impossible.</p>\r
			<p>This was the first boundary repaired for Recipe 37825: <strong>a progress finish solver proves progress facts. The zero quality of a progress-only suffix cannot disprove the entire HQ objective.</strong></p>\r
\r
			<h2>QualityUbSolver: How High Could Quality Possibly Go?</h2>\r
			<p>Being able to finish progress does not mean an HQ or collectable target remains reachable. The solver also needs an upper bound on quality available from the remaining resources.</p>\r
			<p>Raphael's <code>QualityUbSolver</code> relaxes durability, Manipulation, specialist resources, and related effects into a shared budget that is easier to optimize, then uses dynamic programming to maintain a Pareto frontier of progress and quality.</p>\r
			<p>Simply asking for the maximum quality after spending every remaining resource on Touch actions forgets that progress still needs a reserve. A useful result is a set of non-dominated pairs such as <code>(+100 progress, +80 quality)</code> and <code>(+150 progress, +50 quality)</code>. The first has more quality, the second more progress, so both remain relevant.</p>\r
			<p>For each legal action, its <code>(Δprogress, Δquality)</code> is added to the next state's Pareto set, then every result beaten on both dimensions is removed. The result is not one rotation but a boundary of progress-quality exchanges available from the remaining resources.</p>\r
			<p>In the toy example, a second Touch reaches 80 quality but leaves resources for only 50 progress. Saving both durability slots for Synthesis reaches 100 progress but leaves quality at 40. The separate maxima are 100 and 80, but they cannot be obtained together. The joint Pareto boundary exposes that the branch cannot reach <code>(100,80)</code>.</p>\r
			<p>Ruri's current implementation is simpler and looser. <code>QualityUpperBoundSolver</code> assumes that future quality actions happen under an unrealistically favorable setup:</p>\r
			<ul>\r
				<li>Excellent supplies the highest condition multiplier.</li>\r
				<li>Innovation and Great Strides contribute together.</li>\r
				<li>Inner Quiet is evaluated at its maximum stack count.</li>\r
				<li>Remaining durability and CP buy as many quality actions as possible.</li>\r
			</ul>\r
			<p>This is not a real rotation. It is an intentionally inflated ceiling. A branch can be pruned only when it misses the target even in this idealized world.</p>\r
			<div data-code-ref="6"></div>\r
			<p>The second result does not prove feasibility. It only says that infeasibility has not been proved yet. The old solver confused those two conclusions.</p>\r
\r
			<h2>StepLbSolver: How Many Steps Are Still Unavoidable?</h2>\r
			<p>When CP is plentiful, both progress and quality upper bounds become loose and stop pruning effectively. Raphael therefore computes a lower bound on the number of steps still required, even under ideal future actions, to satisfy both progress and quality.</p>\r
			<p>The recurrence resembles shortest path: <code>L(s)=0</code> once the relaxed target is met; otherwise <code>L(s)=1+min L(T(s,a))</code>. To remain a safe lower bound, it may relax CP limits or imagine stronger actions, but it must never overestimate the minimum number of real steps.</p>\r
			<p>If the current prefix has used 25 steps, at least 8 more are required, and a 30-step incumbent already exists, that branch cannot win on step count.</p>\r
			<p>This comparison is valid only after higher-priority goals are equal. A short plan that misses quality cannot dominate a longer max-quality plan.</p>\r
			<p>Ruri currently has a simplified <code>FinishStepLowerBound</code> based on the strongest progress potency available in the recipe. It has not yet implemented Raphael's complete dynamic-programming <code>StepLbSolver</code>. For now, this number helps order the queue rather than proving strict optimality.</p>\r
\r
			<h2>Pareto Pruning: Keep Only States That Are Meaningfully Different</h2>\r
			<p>Consider two states, A and B, with the same condition, previous action, buff timers, and limited-resource context. Suppose A satisfies:</p>\r
			<div data-code-ref="7"></div>\r
			<p>If at least one dimension is strictly better, A dominates B. Anything available after B is normally available after A, with resources no worse, so B does not need further expansion.</p>\r
			<p>A real implementation cannot compare only four numbers. Different buff durations, conditions, or previous actions change both action legality and payoff. Merging those states would create subtle correctness bugs.</p>\r
			<p>Ruri therefore puts Condition, PreviousAction, every relevant buff timer, Inner Quiet, Heart and Soul, Trained Perfection, and other limited resources into a <code>FrontierKey</code>. Only states with the same key compete on progress, quality, durability, and CP. A dominated candidate is discarded; a stronger candidate removes older states that it dominates.</p>\r
			<p>This is deduplication with a wider reach. It removes not only identical states but also states that differ numerically while being worse in every dimension that matters.</p>\r
			<p>Raphael uses bucketing and an approximate Pareto frontier to reduce dominance-check cost at a much larger scale. Ruri still uses a straightforward list per equivalent context.</p>\r
\r
			<h2>How the Pieces Fit Together in Ruri</h2>\r
			<p>Quality objectives in Ruri now route to <code>GlobalCraftSearchSolver</code>. Its broad structure is:</p>\r
			<div data-code-ref="8"></div>\r
			<p><code>CraftSimulator</code> is the source of truth for the entire system. Action legality, CP and durability costs, progress and quality gains, and buff ticking all go through the same simulator. If the search owns one fast approximation of the rules while execution owns another supposedly real one, they will eventually drift apart.</p>\r
			<p>At the beginning of a search, Ruri does three things:</p>\r
			<ol>\r
				<li>Validate that the state and ruleset are complete.</li>\r
				<li>Reject true physical dead ends with the optimistic progress bound.</li>\r
				<li>Use a heuristic planner to seed a finish-capable incumbent.</li>\r
			</ol>\r
			<p>Nodes then enter a priority queue. The priority observes current quality and progress, optimistic ceilings for both, the finish-step lower bound, and remaining CP and durability. Sorting only by quality would recreate the original problem: spend every resource on quality early, then discover that progress cannot finish.</p>\r
			<p>I ended up using a balanced score that gives an opener room to build Inner Quiet and quality buffs, then gradually hands priority to the progress bottleneck once the quality ramp matures.</p>\r
			<p>This is not Raphael's original scoring function. It is an engineering choice made for Ruri's real-time replanning.</p>\r
			<table><thead><tr><th>Role</th><th>Full Raphael approach</th><th>Current Ruri implementation</th></tr></thead><tbody>\r
				<tr><td>Main search</td><td>Best-first + branch-and-bound until optimality is proved</td><td>PriorityQueue with time, depth, and node budgets</td></tr>\r
				<tr><td>FinishSolver</td><td>Feasibility and bounds through compressed-state DP</td><td>Optimistic progress formula + bounded finish beam</td></tr>\r
				<tr><td>QualityUbSolver</td><td>Progress-quality Pareto DP over relaxed resources</td><td>Intentionally loose formula-based quality ceiling</td></tr>\r
				<tr><td>StepLbSolver</td><td>Safe step lower bound through DP</td><td>Simplified estimate from maximum progress potency</td></tr>\r
				<tr><td>Pareto</td><td>Bucketed approximate frontier for large state sets</td><td>List dominance within equivalent contexts</td></tr>\r
				<tr><td>Randomness</td><td>Optional adversarial worst-case mode</td><td>Separate expectimax route; deterministic live default</td></tr>\r
			</tbody></table>\r
			<p>Ruri can therefore prove that it found and replay-verified a plan satisfying the goal. It does not prove that the plan is the shortest among all legal plans. In particular, after reaching a max-quality terminal state, the live path prioritizes returning an executable first action instead of exhausting the queue to prove the shortest macro. That is the central trade-off between real-time execution and offline optimal solving.</p>\r
\r
			<h2>Why I Added Semantic Action Sequences</h2>\r
			<p>Expanding one action at a time is clean, but under a one-second live budget the solver can spend most of its time visiting obvious intermediate states.</p>\r
			<p>Alongside individual actions, Ruri therefore considers several short sequences with useful crafting semantics:</p>\r
			<div data-code-ref="9"></div>\r
			<p>These are not macros that bypass the simulator. Every action in a sequence is replayed and checked one by one. If any action is illegal, the sequence never enters the queue.</p>\r
			<p>It is like giving the search a few common phrases so it does not always have to build a sentence from individual letters.</p>\r
			<p>The cost is explicit. Semantic sequences, priorities, and finite budgets introduce heuristic bias. They help find practical plans quickly, but they are another reason the current implementation cannot be called a strict exact solver.</p>\r
\r
			<h2>A Static Macro Is Not Enough: Replanning in the Live Client</h2>\r
			<p>Finding a complete offline plan does not mean the game should mechanically execute it from beginning to end.</p>\r
			<p>Real crafting conditions change, an action can be rejected, and the observer can temporarily lack a complete state. Ruri therefore uses a receding horizon for live execution:</p>\r
			<div data-code-ref="10"></div>\r
			<p>The solver never needs to pretend it knows future conditions, and simulation error cannot accumulate over dozens of steps without correction.</p>\r
			<p>Executing only the first action does not make the full plan pointless. The complete plan demonstrates that at least one continuation exists behind the chosen action. Re-observation then anchors the next decision back in reality.</p>\r
			<p>If no state change is observed after sending an action, Ruri does not blindly send it again. Unknown state, timeout, session replacement, and resource inconsistency all fail closed. In an automation plugin, refusing to press an uncertain button is more important than trying to keep moving.</p>\r
\r
			<h2>Where Stochastic Actions Belong</h2>\r
			<p>Raphael includes an adversarial mode that evaluates quality under the worst condition sequence, spending more computation to find macros robust to changing conditions. That objective is different from maximizing average return.</p>\r
			<div data-code-ref="11"></div>\r
			<p>Ruri's <code>GlobalCraftSearchSolver</code> currently owns the deterministic, live-safe path. Actions with a success probability and probability-oriented analysis go through a separate <code>StochasticExpectimaxSolver</code>, where decision nodes and chance nodes alternate.</p>\r
			<p>Conservative live mode does not let the global search use random-success actions. One high-value failure can destroy the progress reserve the plan was meant to protect. A future adversarial backend should coexist with expectimax and make the choice between worst-case reliability and higher average return explicit.</p>\r
\r
			<h2>What Actually Changed While Fixing Recipe 37825</h2>\r
			<p>Returning to the original log, this optimization became more than replacing one search routine. It required redefining what several results meant.</p>\r
\r
			<h3>Physical State, Order Goal, and Solver Status Must Be Separate</h3>\r
			<p>The simulator reports physical outcomes such as completed progress or exhausted durability. The order layer decides whether HQ or collectable quality was met. The solver returns a separate set of statuses:</p>\r
			<ul>\r
				<li><code>Solved</code>: a complete plan was found and passed independent simulator replay.</li>\r
				<li><code>Partial</code>: a useful candidate exists, but the complete objective was not proved.</li>\r
				<li><code>TimedOut</code>: the time or node budget was exhausted.</li>\r
				<li><code>Infeasible</code>: hard evidence proves the goal unreachable.</li>\r
				<li><code>Unsupported</code>: the rules model is incomplete, so the solver refuses to guess.</li>\r
			</ul>\r
			<p>The dangerous old behavior was translating “this bounded search did not find a plan” into <code>Infeasible</code>. Without a proof, the honest result is timeout or partial.</p>\r
\r
			<h3>Solved Must Be Simulated Again</h3>\r
			<p>When a search reports <code>Solved</code>, <code>SolverRouter</code> creates a fresh simulator and replays the entire plan from the original state:</p>\r
			<ol>\r
				<li>Every action must be legal.</li>\r
				<li>The terminal state must be a physical success, not durability failure.</li>\r
				<li>Final quality must satisfy the normalized order goal.</li>\r
			</ol>\r
			<p>A failure downgrades the result, and the invalid plan never enters the cache. Finding an answer and checking an answer become separate responsibilities.</p>\r
\r
			<h3>The Cache Is Part of Algorithmic Correctness</h3>\r
			<p>The solver cache key includes recipe data, the complete crafting state, objective, risk options, time and node budgets, ruleset fingerprint, and algorithm version.</p>\r
			<p>Omitting <code>CanHq</code>, a buff, the previous action, or the rule version can make two merely similar requests reuse the same plan. A fast hit on a wrong cache entry only makes a bug more consistent.</p>\r
\r
			<h2>Current Results, and What I Will Not Exaggerate</h2>\r
			<p>The Recipe 37825 regression scenario uses a set of values taken from the live log: 5865 craftsmanship, 5462 control, 664 CP, 9904 starting quality, 10040 required progress, and 21200 maximum quality.</p>\r
			<p>The current global search finds a replayable max-quality completion within the dry-run budget. Simulated live execution replans after each observation and eventually satisfies both progress and quality. Regression tests also cover a missing PreviousAction observation, an early Immaculate Mend, durability reduced to five, and states that have already become physical dead ends.</p>\r
			<p>Several qualifications remain:</p>\r
			<ul>\r
				<li>The reliable finish search is itself a bounded beam with width 16 and at most 8192 expansions, not Raphael's complete DP.</li>\r
				<li>The quality bound is a loose formula-based ceiling, without a shared CP currency or complete Pareto DP.</li>\r
				<li>The step lower bound is a simplified estimate.</li>\r
				<li>The main live search has a one-second, depth, and node budget.</li>\r
				<li>Balanced scoring and semantic action sequences make the result bounded and heuristic, without a strict optimality proof.</li>\r
				<li>Adversarial search over random conditions has not been implemented.</li>\r
				<li>Automated tests prove simulation contracts; they do not mean every recipe has been validated in the real Chinese client.</li>\r
			</ul>\r
			<p>I would rather leave those boundaries visible than hide them behind a phrase such as “AI optimal solver.” Whether an algorithm deserves trust begins with whether it describes honestly what it can prove.</p>\r
\r
			<h2>How I Would Optimize It Next</h2>\r
			<p>If Ruri continues moving toward Raphael's architecture, the order should be deliberate.</p>\r
			<p>First, turn FinishSolver into a genuinely independent dynamic-programming problem. The current beam finds finish paths quickly, but “not found” does not always mean “does not exist.” Stronger memoization and state compression can reduce that uncertainty.</p>\r
			<p>Second, build a tighter quality upper bound. Convert durability, Manipulation, and limited resources into a shared budget, then maintain a <code>(progress, quality)</code> Pareto frontier. A tighter bound keeps the main search from spending time on imaginary high-quality continuations.</p>\r
			<p>Third, implement a complete StepLbSolver. It becomes especially useful when resources are plentiful, where it can prove that a path cannot beat the incumbent on step count.</p>\r
			<p>Fourth, replace the list-based frontier with buckets and measure dominance hit rates. Before optimizing, determine whether time is actually going into transitions, bounds, or dominance checks.</p>\r
			<p>Fifth, add adversarial mode and Monte Carlo replay. The former answers whether a plan survives worst-case conditions. The latter estimates the probability of reaching HQ or a collectable tier under an explicit probability model.</p>\r
			<p>Parallelism comes last. Without strong pruning, more threads simply generate useless states faster.</p>\r
\r
			<h2>Closing Thoughts</h2>\r
			<p>Studying Raphael changed how I think about a crafting solver. It is not a machine that memorizes a rotation.</p>\r
			<p>What it really manages is a series of proofs.</p>\r
			<ul>\r
				<li>FinishSolver proves that a path still has the resources to finish.</li>\r
				<li>QualityUbSolver proves whether it still deserves to pursue the quality target.</li>\r
				<li>StepLbSolver proves whether it can still beat the current answer on length.</li>\r
				<li>The Pareto frontier proves which states are merely inferior duplicates.</li>\r
				<li>Independent replay proves that the answer returned by the search actually obeys the rules.</li>\r
			</ul>\r
			<p>Ruri has implemented only part of that path, with several practical compromises for a one-second live budget. Still, the false Recipe 37825 result left one useful principle embedded in the code:</p>\r
			<blockquote><p>Failing to find an answer does not mean no answer exists. Only call a goal infeasible when you can provide a proof.</p></blockquote>\r
			<p>That principle matters more than any single crafting macro.</p>\r
\r
			<h2>References</h2>\r
			<ul>\r
				<li><a href="https://github.com/KonaeAkira/raphael-rs">KonaeAkira/raphael-rs</a></li>\r
				<li><a href="https://github.com/KonaeAkira/raphael-rs/wiki/Algorithm-Overview">Raphael Algorithm Overview</a></li>\r
				<li><a href="https://github.com/Tnze/ffxiv-best-craft">Tnze/ffxiv-best-craft</a></li>\r
				<li><a href="https://github.com/PunishXIV/Artisan">PunishXIV/Artisan</a></li>\r
			</ul>\r
`;export{e as default};