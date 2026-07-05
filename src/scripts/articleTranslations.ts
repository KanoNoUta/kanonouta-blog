type LanguageKey = 'zh' | 'ja' | 'en';

type ArticleTranslations = Record<string, Partial<Record<Exclude<LanguageKey, 'zh'>, string>>>;

const withCodeBlocks = (html: string, codeRefs: number[]): string =>
	codeRefs.reduce((result, index) => result.replace(`{{code:${index}}}`, `<div data-code-ref="${index}"></div>`), html);

const articleTranslations: ArticleTranslations = {
	'back-to-blog': {
		ja: `
			<p>ドメインが戻ってきたので、ブログも戻ってくるべきだと思いました。</p>
			<p>ずっと前から、個人ブログは少しゆっくりした部屋のような場所でした。すぐに何かを言うことを急かさず、すべての言葉を流れて消える投稿に変える必要もありません。ここに書いて残しておけば、数年後の自分がもう一度出会えます。</p>
			<p>このサイトはまずシンプルに始めます。Astro の静的ブログ、自分のドメイン、いくつかの Markdown 記事。リンク、アーカイブ、コメント、昔の記事の移行、個人サイトらしい細かなものは、これから少しずつ足していきます。</p>
			<p>まずは扉を開けます。</p>
		`,
		en: `
			<p>The domain is back, so the blog should come back too.</p>
			<p>For a long time, a personal blog has felt like a slower room. It does not rush me to speak immediately, and it does not ask every sentence to become a tiny tile in a fast-moving feed. If I write things down and leave them here, I can meet them again years later.</p>
			<p>This site will start simple: an Astro static blog, my own domain, and a few Markdown posts. Links, archives, comments, old post migration, and the small details that belong to a personal site can grow slowly after that.</p>
			<p>First, open the door.</p>
		`,
	},
	'ffxiv-acr-devlog': {
		ja: withCodeBlocks(`
			<p>この記事は、この数日間で KANO 暗黒騎士 ACR を開発した流れを整理したものです。</p>
			<p>単なる成果報告ではなく、教学寄りの開発ノートです。基礎ループ、バーストロジック、QT スイッチ、Hotkey パネル、設定保存、リソースファイル、そして購読リポジトリ形式での配布まで、ACR を作る時に何を考える必要があるのかをまとめます。</p>
			<p>一部の挙動は、成熟した実装や公開資料を観察して整理しました。ここでは具体的なリバース工程には触れません。価値があるのは、観察した考え方を自分の保守可能でデバッグしやすく、配布できるプロジェクト構造に落とし込む部分です。</p>

			<h2>開発目標</h2>
			<p>KANO の最初の目標は明快でした。レベル 100 の暗黒騎士ローテーションを書くことです。</p>
			<p>しかし実際に作り始めると、長く使える ACR は「スキルを順番に押す」だけでは足りないと分かります。少なくとも次の問題を解かなければなりません。</p>
			<ul>
				<li>高難易度モードと日課モードを分ける。</li>
				<li>レベル 100 のバーストを標準的な循環にできるだけ合わせる。</li>
				<li>60 秒 / 120 秒バーストを安定して起動する。</li>
				<li>GCD と oGCD の差し込みが互いに詰まらないようにする。</li>
				<li>QT スイッチで細かな挙動を制御できるようにする。</li>
				<li>Hotkey から軽減、挑発、ブラックナイト、オブレーションなどを優先発動できるようにする。</li>
				<li>UI は読みやすく、ドラッグ移動と位置保存に対応する。</li>
				<li>設定は保存され、プラグイン再起動のたびに初期化されない。</li>
				<li>リソースファイルは DLL と一緒に配布し、ローカル絶対パスに依存しない。</li>
				<li>最後に購読リポジトリが読める形式でパッケージ化する。</li>
			</ul>
			<p>結果として、このプロジェクトは戦闘判断、UI、設定、リソース、パッケージ、公開を含む、ひとつの完全な ACR 開発例になりました。</p>

			<h2>全体構成</h2>
			<p>最終的には、かなり分かりやすい階層構造にしました。</p>
			{{code:0}}
			<p>各層は自分の責務だけを持ちます。</p>
			<p><code>KanoRotation</code> は ACR の入口で、GCD / oGCD の Resolver 登録、開幕、イベント、UI 有効化、戦闘状態を扱います。</p>
			<p><code>DrkGcdResolver</code> は次の GCD を決めるだけです。</p>
			<p><code>DrkOffGcdResolver</code> は次のアビリティを決めるだけです。</p>
			<p><code>DrkAeLogic</code> には本当のジョブロジックを置きます。バーストに入るか、MP を吐くか、フレイを呼ぶか、シャドウブリンガーを使うか、日課で AOE するか、自動軽減を発動するか、といった判断です。</p>
			<p><code>ApiHelper</code> は PR API を包む薄い外殻です。あとで本体 API が変わっても、できるだけ Helper だけを直し、業務ロジックにフレームワーク呼び出しを散らさないためです。</p>
			<p>ここで一番大切なのは、すべての判断を Resolver に詰め込まないことです。Resolver は調度役のようにして、本当のルールはロジック層に沈めるべきです。</p>

			<h2>入口クラス：接線だけを担当する</h2>
			<p>ACR の入口クラスは一般に <code>IRotation</code> を実装し、<code>RotationMetadata</code> でジョブ、作者、バージョンなどを示します。</p>
			<p>簡略化すると次のようになります。</p>
			{{code:1}}
			<p>ここで重要なのは、<code>NextGcd</code> と <code>NextOffGcd</code> を分けることです。</p>
			<p><code>NextGcd</code> は次の GCD を返します。</p>
			<p><code>NextOffGcd</code> は次のアビリティを返します。</p>
			<p>暗黒騎士の循環品質は、oGCD の差し込みが安定するかに大きく依存します。二つを混ぜると、後のデバッグがつらくなります。</p>

			<h2>なぜ GCD と oGCD を必ず分けるのか</h2>
			<p>最初に循環が壊れた時、よくある症状は「GCD は基本コンボを続けるのにアビリティがまったく入らない」、または「バースト中と表示されるのに実際には実行されない」というものです。</p>
			<p>これは多くの場合、スキル ID のミスではなく、スケジューリングのミスです。</p>
			<p>FFXIV の戦闘テンポは大まかにこうです。</p>
			<ul>
				<li>GCD が回っている間にアビリティを差し込める。</li>
				<li>通常、ひとつの GCD 間隔で最大 2 回差し込む。</li>
				<li>アビリティ判定が保守的すぎると何も入らない。</li>
				<li>攻めすぎると GCD を噛む。</li>
			</ul>
			<p>だから oGCD は「リキャストが戻ったら押す」では足りません。「リキャストが戻り、今の窓が差し込みに適している時だけ押す」が正しいです。</p>
			{{code:2}}
			<p>実際のプロジェクトでは、スキルキュー、移動、対象、ジョブリソース、スイッチ状態も考えます。ただし原則は変わりません。まず使えるかを判断し、次に何を使うべきかを判断します。</p>

			<h2>暗黒騎士のリソース視点</h2>
			<p>暗黒騎士は「光ったスキルを押す」ジョブではありません。</p>
			<p>管理すべきリソースと窓があります。</p>
			<ul>
				<li>MP</li>
				<li>ブラックブラッド</li>
				<li>暗黒状態の残り時間</li>
				<li>ブラッドウェポン / デリリアム</li>
				<li>フレイの窓</li>
				<li>60 秒バースト</li>
				<li>120 秒バースト</li>
				<li>シャドウブリンガーのチャージ</li>
				<li>ソルトアースとソルト・アンド・ダークネス</li>
			</ul>
			<p>そのため循環ロジックは、まず「今はどの段階か」を答える必要があります。</p>
			{{code:3}}
			<p><code>掠影示現</code> は通常のリソース消費ロジックに邪魔されるべきではなく、バーストロジック内で明確な優先度を持つべきです。</p>
			{{code:4}}
			<p>MP のしきい値を固定してはいけません。高難易度ではバースト、ブラックナイト、リソースプールを考えます。日課では気持ちよく動き、小型敵を処理できることの方が重要です。</p>

			<h2>バーストロジック：先に窓を定義し、次に優先度を並べる</h2>
			<p>暗黒騎士のバーストでは、次の内容を安定して入れることが重要です。</p>
			<ul>
				<li>ブラッドウェポン / デリリアム</li>
				<li>フレイ</li>
				<li>シャドウブリンガー</li>
				<li>ソルトアース</li>
				<li>ソルト・アンド・ダークネス</li>
				<li>カーヴ・アンド・スピット / アビサルドレイン</li>
				<li>MP 消費</li>
				<li>ブラッドスピラー / クワイタス</li>
				<li>フレイの追撃</li>
			</ul>
			<p>開幕 120 秒バーストが「循環中」と出るのに、実際にはアビリティを使わない問題がありました。</p>
			<ol>
				<li>開幕窓を単独で識別する。</li>
				<li>バースト共通条件を分けて書く。</li>
				<li>フレイ、デリリアム、シャドウブリンガー、ソルトアースを優先度順に並べる。</li>
				<li>MP 消費は、全消費する時とブラックナイト用に残す時を知る。</li>
				<li>QT が既定挙動を上書きできる。</li>
			</ol>
			{{code:5}}
			<p>この優先度が重要です。120 秒窓ではシャドウブリンガーと MP 消費の両方が可能でも、同じ種類のリソースではありません。実戦では Logs と比較して調整すべきで、勘で条件を積むべきではありません。</p>

			<h2>QT：ボタンは本当に循環へ影響するべき</h2>
			<p>最終的に実用的な QT をいくつか残しました。</p>
			<ul>
				<li>ブラッドウェポン / デリリアム</li>
				<li>フレイ</li>
				<li>シャドウブリンガー</li>
				<li>ソルトアース</li>
				<li>カーヴ / アビサル</li>
				<li>MP 消費</li>
				<li>追撃、DoT、AOE、リソース温存、バースト薬、強制 AOE、一時停止</li>
				<li>日課用の自動軽減、自動挑発、まとめ狩りモード</li>
			</ul>
			<p>QT の本質は表示ではなく、循環を本当に変えることです。</p>
			{{code:6}}
			<p>ひとつの QT はひとつの種類の挙動だけを制御するのが理想です。ひとつのボタンが多くを変えすぎると、後でどのスイッチが結果を変えたのか分からなくなります。</p>

			<h2>高難易度モードと日課モードを無理に混ぜない</h2>
			<p>高難易度と日課では目的が違います。</p>
			<p>高難易度では、バースト合わせ、リソース管理、日課向けのまとめ狩りロジックからの分離、時間軸軽減、安定した開幕が重要です。</p>
			<p>日課では、自動 AOE、まとめ狩り、自動軽減、低レベル対応、止まらず気持ちよく動くことが重要です。</p>
			{{code:7}}
			{{code:8}}
			<p>一つのロジックで両方を覆おうとしない方がいいです。目的が違うため、無理に合わせると互いに邪魔します。</p>

			<h2>自動軽減：単純に見えて、最も Debug が必要</h2>
			<p>日課用の自動軽減は典型的な機能です。日課モードか、QT が有効か、戦闘中か、周囲の敵数、HP、Boss 詠唱、敵視、大軽減のずらし、小型敵がすぐ倒れそうか、などを判断します。</p>
			{{code:9}}
			<p>自動軽減には必ず Debug を入れます。なぜ発動しなかったのかが分からないと、調整できません。</p>
			{{code:10}}
			<p>このような情報は「なぜ軽減しないのか」という曖昧な疑問よりずっと役に立ちます。</p>

			<h2>Hotkey パネル：UI にスキルロジックを書き込まない</h2>
			<p>Hotkey は KANO の体験で大事な部分です。単なるボタン一覧ではなく、クリック発動、CD 表示、回数表示、2 番目メンバーへのブラックナイト / オブレーション、リビングデッド、LB、挑発、シャーク、防 knockback、スタンス切替、アイコン同梱、順序ドラッグ、位置保存に対応する浮動ウィンドウにしました。</p>
			{{code:11}}
			<p>クリック時は UI にスキル処理を書かず、<code>Logic.OnClick()</code> に任せます。</p>
			{{code:12}}
			<p>こうすると「自分へ」「2 番目へ」「スタンス切替」「LB」をそれぞれ独立したロジッククラスとして扱えます。</p>

			<h2>カスタム QT UI：描画と状態を分離する</h2>
			<p>最初は PR 本体の QT を使いましたが、見た目の自由度が足りませんでした。後で KANO 自前の QT ウィンドウを作りました。</p>
			<p>利点は、外観を完全に制御できること、1 行あたりのボタン数を調整できること、本体 QT を隠せること、Hotkey や制御パネルと視覚を統一できることです。</p>
			{{code:13}}
			<p>この UI の要点は、外観を <code>drawList</code> で描き、クリック領域を <code>InvisibleButton</code> にし、状態を QT から読み、クリック後に QT へ書き戻すことです。UI は循環ロジックを決めません。表示と状態変更だけを担当します。</p>

			<h2>設定保存：一時ディレクトリへ書かない</h2>
			<p>設定保存は見落としやすいですが、体験に大きく影響します。KANO ではモード、QT 既定状態、Hotkey 順序、各ウィンドウ位置、開幕カウント、MP しきい値、自動軽減しきい値を保存する必要があります。</p>
			{{code:14}}
			<p>ここで踏んだ罠は、PR の一時 cache ディレクトリに保存しないことです。</p>
			{{code:15}}
			<p>プロセス ID が変わると、設定が失われたように見えます。安定した保存先はプラグイン設定ディレクトリです。</p>
			{{code:16}}
			<p>これならユーザーごとの正しい場所へ保存され、作者のローカルパスにもプロセス ID にも依存しません。</p>

			<h2>リソース配布：ローカル絶対パスに依存しない</h2>
			<p>Hotkey アイコンはローカル絶対パスで試せますが、配布時にはプロジェクトに含める必要があります。</p>
			{{code:17}}
			{{code:18}}
			{{code:19}}
			<p>これで他人がプラグインをダウンロードしても、アイコンが正常に表示されます。</p>

			<h2>タイムライン連携：重要なのはノードの意味</h2>
			<p>時間軸の試作も行いました。ひとつは軽減軸のように時間軸からスキルを発動するもの、もうひとつは時間軸から QT を制御するものです。</p>
			{{code:20}}
			<p>重要なのは、時間軸の行動ノードが本体に認識される意味を持つことです。名前だけでは動きません。ACR / PR が実行できる動作へ結びついている必要があります。</p>
			<p>時間軸は単なる JSON 変換ではありません。ノードの意味が、本体の実行できる行動と一致していなければなりません。</p>

			<h2>デバッグ方法</h2>
			<p>ACR 開発で最も重要なのはデバッグです。次の方法を使いました。</p>
			<ol>
				<li>ゲーム内で次の GCD / oGCD を見る。</li>
				<li>開発パネルで現在状態を出す。</li>
				<li>木人で試す。</li>
				<li>ACT / FFLogs とスキル数を比較する。</li>
				<li>成熟した実装と 60 / 120 秒窓を比較する。</li>
				<li>ビルド後に PR ACR ディレクトリへ直接入れて試す。</li>
			</ol>
			{{code:21}}
			<p>この情報は「スキルが出ない」よりずっと具体的です。<code>false</code> を返す判断は、なぜ <code>false</code> なのかを説明できるべきです。</p>

			<h2>パッケージ化と GitHub 公開</h2>
			<p>PR の ACR 購読には、<code>KANO.zip</code>、<code>repo.json</code>、GitHub Release が必要です。</p>
			{{code:22}}
			<ol>
				<li><code>dotnet build -c Release</code></li>
				<li><code>KANO.dll</code>、<code>KANO.deps.json</code>、<code>Resources</code> を一時 pkg フォルダに入れる。</li>
				<li><code>KANO.zip</code> に圧縮する。</li>
				<li>SHA256 を計算する。</li>
				<li><code>repo.json</code> を更新する。</li>
				<li>GitHub Release へアップロードする。</li>
			</ol>
			{{code:23}}
			{{code:24}}
			<p><code>repo.json</code> は BOM なし UTF-8 にするのが安全です。一部のパーサーで余計な問題を避けられます。</p>

			<h2>重要な経験</h2>
			<ol>
				<li>まず動く循環を書き、その後で UI を整える。</li>
				<li>複雑な判断は必ず理由を説明できるようにする。</li>
				<li>QT は多ければ良いわけではない。各 QT は明確な目的を持つべきです。</li>
				<li>高難易度と日課は分ける。片方は厳密さ、片方は快適さを求めます。</li>
				<li>ローカルパスに依存しない。アイコン、設定、公開ファイルは他人の PC で動く必要があります。</li>
				<li>成熟した実装から学ぶべきなのは、コードの丸写しではなく挙動です。</li>
			</ol>

			<h2>次にできること</h2>
			<p>今後は戦闘分析パネル、自動軽減 Debug、120 / 60 秒バースト状態灯、時間軸 QT 制御、設定のインポート / エクスポート、日課低レベル対応、FFLogs 比較補助、一括公開スクリプトを追加できます。</p>
			<p>最初に追加するなら、戦闘分析パネルがおすすめです。暗影鋒が何回足りないか、シャドウブリンガーが遅れたか、120 秒窓で MP を吐き切れたかを直接確認でき、調整がかなり楽になります。</p>

			<h2>結び</h2>
			<p>KANO を作って強く感じたのは、ACR は単にスキルを順番に並べるものではない、ということです。</p>
			<p>それは小さな戦闘意思決定システムです。ジョブ循環、フレームワーク API、UI、設定、リソース、公開、そして実戦ログからの反省をすべて扱います。</p>
			<p>基礎構造ができると、その後の改善はずっと楽になります。KANO は「スキルを撃てる」状態から、「保守できる、デバッグできる、公開できる」ACR になりました。それがこの数日間で一番価値のある成果でした。</p>
		`, Array.from({ length: 25 }, (_, index) => index)),
		en: withCodeBlocks(`
			<p>This post records the process of developing the KANO Dark Knight ACR over the last few days.</p>
			<p>It is not just a showcase. It is a teaching-oriented development note about what an ACR needs to consider: basic rotation, burst logic, QT switches, a Hotkey panel, settings persistence, resource files, and finally packaging the project into a subscription repository format.</p>
			<p>Some behavior was aligned by observing mature implementations and public material. I will not go into concrete reverse-engineering details here. The valuable part is the second half: turning observed ideas into a project that is maintainable, debuggable, and publishable.</p>

			<h2>Development Goals</h2>
			<p>KANO started with a direct goal: build a level 100 Dark Knight rotation.</p>
			<p>Once the work began, it became clear that a long-term usable ACR cannot merely press skills in order. It has to solve at least these problems:</p>
			<ul>
				<li>Separate high-end mode from daily mode.</li>
				<li>Align the level 100 burst with the standard rotation as much as possible.</li>
				<li>Trigger the 60-second and 120-second burst windows reliably.</li>
				<li>Prevent GCD and oGCD weaving from blocking each other.</li>
				<li>Let QT switches control rotation details.</li>
				<li>Let Hotkeys prioritize mitigation, provoke, Blackest Night, Oblation, and similar actions.</li>
				<li>Make the UI understandable, draggable, and able to save its position.</li>
				<li>Persist settings instead of resetting them whenever the plugin restarts.</li>
				<li>Ship resource files together with the DLL, without relying on local absolute paths.</li>
				<li>Package everything into a format that a subscription repository can read.</li>
			</ul>
			<p>So the project became a complete ACR development example that covers combat decisions, UI, settings, resources, packaging, and release.</p>

			<h2>Overall Architecture</h2>
			<p>I ended up with a clear layered structure.</p>
			{{code:0}}
			<p>Each layer has one job.</p>
			<p><code>KanoRotation</code> is the ACR entry point. It registers GCD and oGCD resolvers and handles opener state, events, UI activation, and combat state.</p>
			<p><code>DrkGcdResolver</code> only decides the next GCD.</p>
			<p><code>DrkOffGcdResolver</code> only decides the next ability.</p>
			<p><code>DrkAeLogic</code> contains the real job logic: whether to enter burst, spend MP, summon Fray, use Shadowbringer, use AOE in daily mode, or trigger automatic mitigation.</p>
			<p><code>ApiHelper</code> is my wrapper around the PR API. If the framework API changes later, I can change the helper instead of scattering framework calls everywhere.</p>
			<p>The key idea is this: do not put every decision into a Resolver. A Resolver should behave like a dispatcher. The actual rules should live in the logic layer.</p>

			<h2>Entry Class: Wiring Only</h2>
			<p>An ACR entry class usually implements <code>IRotation</code> and uses <code>RotationMetadata</code> to describe job, author, version, and scope.</p>
			<p>A simplified version looks like this:</p>
			{{code:1}}
			<p>The important part is keeping <code>NextGcd</code> and <code>NextOffGcd</code> separate.</p>
			<p><code>NextGcd</code> returns the next GCD.</p>
			<p><code>NextOffGcd</code> returns the next ability.</p>
			<p>A large part of Dark Knight rotation quality depends on stable oGCD weaving. If both paths are mixed together, debugging becomes painful.</p>

			<h2>Why GCD and oGCD Must Be Split</h2>
			<p>When the rotation first broke, a common symptom was that GCD combos kept running while abilities never weaved, or the rotation claimed to be in burst but did not actually execute burst abilities.</p>
			<p>This is usually not a wrong skill ID. It is scheduling logic.</p>
			<p>FFXIV combat timing roughly works like this:</p>
			<ul>
				<li>Abilities can be woven while the GCD is rolling.</li>
				<li>Normally one GCD interval can fit up to two weaves.</li>
				<li>If ability checks are too conservative, nothing gets woven.</li>
				<li>If they are too aggressive, they clip the GCD.</li>
			</ul>
			<p>So oGCD logic should not be “use it when cooldown is ready.” It should be: the cooldown is ready, and the current window is suitable for weaving.</p>
			{{code:2}}
			<p>The real project has more conditions, including queue state, movement, target, resources, and switch state. The principle stays the same: first decide whether a weave is possible, then decide what to weave.</p>

			<h2>The Resource View of Dark Knight</h2>
			<p>Dark Knight is not just about pressing the skill that lights up.</p>
			<p>It manages several resources and windows:</p>
			<ul>
				<li>MP</li>
				<li>Blood gauge</li>
				<li>Darkside duration</li>
				<li>Blood Weapon / Delirium</li>
				<li>Fray window</li>
				<li>60-second burst</li>
				<li>120-second burst</li>
				<li>Shadowbringer charges</li>
				<li>Salted Earth and Salt and Darkness</li>
			</ul>
			<p>The rotation must first answer one question: what phase am I in right now?</p>
			{{code:3}}
			<p><code>Living Shadow</code> should not be blocked by normal resource-spending logic. It needs a clear priority inside burst logic.</p>
			{{code:4}}
			<p>The MP threshold cannot be hard-coded. High-end mode cares about burst, Blackest Night, and resource pooling. Daily mode cares more about comfort, uptime, and handling packs.</p>

			<h2>Burst Logic: Define the Window, Then Order Priority</h2>
			<p>Dark Knight burst needs to fit these actions reliably:</p>
			<ul>
				<li>Blood Weapon / Delirium</li>
				<li>Fray</li>
				<li>Shadowbringer</li>
				<li>Salted Earth</li>
				<li>Salt and Darkness</li>
				<li>Carve and Spit / Abyssal Drain</li>
				<li>MP spending</li>
				<li>Bloodspiller / Quietus</li>
				<li>Fray follow-up</li>
			</ul>
			<p>I hit a classic issue: the opener 120-second burst showed as active, but abilities were not being used.</p>
			<ol>
				<li>Identify the opener window separately.</li>
				<li>Write shared burst conditions separately.</li>
				<li>Order Fray, Delirium, Shadowbringer, Salted Earth, and similar actions by priority.</li>
				<li>Make MP spending aware of when to dump everything and when to keep MP for Blackest Night.</li>
				<li>Let QT override default behavior.</li>
			</ol>
			{{code:5}}
			<p>Priority matters. In a 120-second window, Shadowbringer and MP spending may both be available, but they are not the same kind of resource. Shadowbringer is a key burst action; MP spending is a dump. The order should be tuned through logs, not guesswork.</p>

			<h2>QT: Buttons Must Actually Affect the Rotation</h2>
			<p>I kept a practical set of QT switches:</p>
			<ul>
				<li>Blood Weapon / Delirium</li>
				<li>Fray</li>
				<li>Shadowbringer</li>
				<li>Salted Earth</li>
				<li>Carve / Abyssal</li>
				<li>MP spending</li>
				<li>Follow-up, DoT, AOE, resource holding, potion, forced AOE, pause</li>
				<li>Daily-mode automatic mitigation, automatic provoke, and pull mode</li>
			</ul>
			<p>The point of QT is not to display a button. It is to change the rotation for real.</p>
			{{code:6}}
			<p>One QT should control one category of behavior. If a button affects too many things, later debugging becomes guesswork.</p>

			<h2>Do Not Force High-End and Daily Modes Together</h2>
			<p>High-end and daily mode optimize for different things.</p>
			<p>High-end mode wants burst alignment, stable resource pooling, isolation from daily pull logic, timeline mitigation, and a stable opener.</p>
			<p>Daily mode wants automatic AOE, pulls, mitigation, low-level compatibility, and comfortable behavior without idle gaps.</p>
			{{code:7}}
			{{code:8}}
			<p>Do not try to cover both with one logic path. Their goals differ, and forcing them together makes them fight each other.</p>

			<h2>Automatic Mitigation: Simple Looking, Debug Heavy</h2>
			<p>Daily automatic mitigation has to check mode, QT state, combat state, nearby enemies, player HP, boss casts, current aggro, mitigation spacing, and whether enemies are about to die.</p>
			{{code:9}}
			<p>Automatic mitigation needs Debug output. Without it, you cannot tell why it did not trigger.</p>
			{{code:10}}
			<p>This is much more useful than staring at the game and asking why a mitigation did not happen.</p>

			<h2>Hotkey Panel: Do Not Hard-Code Skill Logic in the UI</h2>
			<p>Hotkey support is an important part of KANO. I made it a floating window rather than a plain button list: click to cast, dim on cooldown, show cooldown and charges, support second-party Blackest Night / Oblation, Living Dead, LB, Provoke, Shirk, knockback prevention, stance toggle, bundled icons, drag ordering, and position persistence.</p>
			{{code:11}}
			<p>On click, the UI should not contain skill logic directly. It should delegate to <code>Logic.OnClick()</code>.</p>
			{{code:12}}
			<p>That keeps “self target,” “party slot 2,” “stance toggle,” and “LB” as separate logic classes instead of a tangled UI file.</p>

			<h2>Custom QT UI: Separate Drawing from State</h2>
			<p>I started with PR’s built-in QT, but it did not give enough visual control. Later I built KANO’s own QT floating window.</p>
			<p>The benefits are full style control, custom button rows, the ability to hide the built-in QT, and a unified look with Hotkey and control panels.</p>
			{{code:13}}
			<p>The pattern is: draw appearance with <code>drawList</code>, use <code>InvisibleButton</code> for the clickable area, read state from QT, and write state back after clicks. UI should display and modify state, not decide combat logic.</p>

			<h2>Settings Persistence: Do Not Write to Temporary Directories</h2>
			<p>Settings persistence is easy to forget, but it affects the experience a lot. KANO needs to save mode, QT defaults, Hotkey order, window positions, opener countdown, MP thresholds, and mitigation thresholds.</p>
			{{code:14}}
			<p>The trap I hit was saving into PR’s temporary cache directory.</p>
			{{code:15}}
			<p>When the process ID changes after restart, the settings look lost. The stable approach is to save into the plugin config directory.</p>
			{{code:16}}
			<p>That makes the settings persist on each user’s machine without hard-coding my username or depending on a process-specific folder.</p>

			<h2>Resource Publishing: Do Not Depend on Local Absolute Paths</h2>
			<p>Hotkey icons can be tested from a local absolute path, but release builds must include them in the project.</p>
			{{code:17}}
			{{code:18}}
			{{code:19}}
			<p>With this layout, icons still render correctly after someone else downloads the plugin.</p>

			<h2>Timeline Integration: Node Semantics Matter</h2>
			<p>I also experimented with timeline integration. One category triggers skills, such as mitigation timelines. Another category controls QT, such as enabling “keep MP for Blackest Night during burst” for a phase.</p>
			{{code:20}}
			<p>The important detail is that timeline action nodes must mean something the runtime can execute. A label is not enough. The node has to bind to an action that ACR / PR recognizes.</p>
			<p>A timeline is not just JSON conversion. Node semantics must match executable runtime behavior.</p>

			<h2>Debugging Methods</h2>
			<p>Debugging is the heart of ACR development. I used these methods:</p>
			<ol>
				<li>Watch the next GCD / oGCD in game.</li>
				<li>Print current state in a development panel.</li>
				<li>Test on a dummy.</li>
				<li>Compare skill counts through ACT / FFLogs.</li>
				<li>Compare 60-second and 120-second windows with mature implementations.</li>
				<li>Build and copy directly into the PR ACR directory for testing.</li>
			</ol>
			{{code:21}}
			<p>This is much more useful than “the skill did not fire.” Any condition that can return <code>false</code> should be able to explain why it returned <code>false</code>.</p>

			<h2>Packaging and GitHub Release</h2>
			<p>A PR ACR subscription generally needs <code>KANO.zip</code>, <code>repo.json</code>, and a GitHub Release.</p>
			{{code:22}}
			<ol>
				<li><code>dotnet build -c Release</code></li>
				<li>Put <code>KANO.dll</code>, <code>KANO.deps.json</code>, and <code>Resources</code> into a temporary package folder.</li>
				<li>Compress it into <code>KANO.zip</code>.</li>
				<li>Calculate SHA256.</li>
				<li>Update <code>repo.json</code>.</li>
				<li>Upload to GitHub Release.</li>
			</ol>
			{{code:23}}
			{{code:24}}
			<p><code>repo.json</code> should preferably be UTF-8 without BOM to avoid parser surprises.</p>

			<h2>Key Lessons</h2>
			<ol>
				<li>Write a working rotation before making the UI pretty.</li>
				<li>Every complex decision should explain itself.</li>
				<li>More QT switches are not always better. Each one needs a clear purpose.</li>
				<li>Separate high-end and daily mode. One wants strictness; the other wants comfort.</li>
				<li>Do not depend on local paths. Icons, settings, and release files must work on other machines.</li>
				<li>When learning from mature implementations, learn behavior rather than copying code.</li>
			</ol>

			<h2>What Could Come Next</h2>
			<p>KANO could add a combat analysis panel, automatic mitigation Debug, 120 / 60 burst status lights, timeline QT control nodes, config import and export, better low-level daily support, FFLogs comparison helpers, and a one-click release script.</p>
			<p>If I continue, I would add the combat analysis panel first. It can directly show whether Edge uses are missing, whether Shadowbringer was delayed, and whether MP was dumped inside the 120-second window. That saves a lot of time compared with reading combat logs by eye.</p>

			<h2>Conclusion</h2>
			<p>The biggest lesson from building KANO is that writing an ACR is not simply arranging skills in order.</p>
			<p>It is a small combat decision system. It needs job knowledge, framework API knowledge, UI, settings, resources, release packaging, and constant feedback from real combat logs.</p>
			<p>Once the base structure is solid, every later optimization becomes easier. KANO has moved from “able to press skills” to “maintainable, debuggable, and publishable,” and that is the most valuable result of these few days of work.</p>
		`, Array.from({ length: 25 }, (_, index) => index)),
	},
};

const originalArticleHtml = new WeakMap<HTMLElement, string>();

const getPostId = (): string | null => {
	const page = document.body.dataset.i18nPage;
	if (!page?.startsWith('post.')) return null;
	return page.slice('post.'.length);
};

export const applyArticleTranslation = (language: LanguageKey): void => {
	const prose = document.querySelector<HTMLElement>('.prose');
	const postId = getPostId();
	if (!prose || !postId) return;

	if (!originalArticleHtml.has(prose)) {
		originalArticleHtml.set(prose, prose.innerHTML);
	}

	const sourceHtml = originalArticleHtml.get(prose) ?? prose.innerHTML;

	if (language === 'zh') {
		prose.innerHTML = sourceHtml;
		return;
	}

	const translatedHtml = articleTranslations[postId]?.[language];
	if (!translatedHtml) {
		prose.innerHTML = sourceHtml;
		return;
	}

	const sourceTemplate = document.createElement('template');
	sourceTemplate.innerHTML = sourceHtml;
	const codeBlocks = Array.from(sourceTemplate.content.querySelectorAll('pre'));

	prose.innerHTML = translatedHtml;
	prose.querySelectorAll<HTMLElement>('[data-code-ref]').forEach((slot) => {
		const index = Number(slot.dataset.codeRef);
		const replacement = codeBlocks[index]?.cloneNode(true);
		if (replacement) {
			slot.replaceWith(replacement);
		} else {
			slot.remove();
		}
	});
};
