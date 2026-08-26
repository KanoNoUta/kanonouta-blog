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
	'thief-neko-protocol-gateway-devlog': {
		ja: withCodeBlocks(`
			<p>最初、手元にあったのは Catpaw が提供する GLM-5.2 の呼び出し枠だけでした。</p>
			<p>目標も単純でした。この枠を Claude Code につなぎ、モデルに質問へ答えさせるだけでなく、プロジェクトを読み、ファイルを変更し、コマンドを実行して、一連の開発作業を完了させることです。</p>
			<p>当時は、リバースプロキシを一つ書けば十分だと思っていました。Claude Code のリクエストを Catpaw に転送し、返答をそのまま返すだけです。しかし実際に始めると、両端とも大規模言語モデルを呼び出してはいても、同じ「プロトコル言語」を話していないことが分かりました。</p>
			<p>最終的に、この小さなプロキシは <strong>Thief Neko</strong> へ育ちました。Anthropic Messages、OpenAI Chat Completions、OpenAI Responses を同時に扱う、状態を持ったプロトコルゲートウェイです。</p>
			<p>この記事では実装内容を記録するだけでなく、ひとつの問いを明確にします。<strong>大規模言語モデルのゲートウェイが、本当に使えるのか、それとも単に文字を返せるだけなのかを、どう判断するか。</strong></p>

			<h2>まず「動いた」とは何かを定義する</h2>
			<p>ゲートウェイが初めてモデルの文章を返した時、主な作業は終わったと思いました。</p>
			<p>ところが Claude Code がツール呼び出しに入ると、すぐに問題が表れました。モデルは「プロジェクトを確認します」と言い、操作計画らしい文章を出して、そのまま終了します。Catpaw の枠は消費されたのに、Claude Code は何のツールも実行していません。</p>
			<p>つまり「モデルが返答した」は、最も弱い成功にすぎません。Agent クライアントでは、少なくとも次の四点を順に確認する必要があります。</p>
			<ol>
				<li>通常のテキストを正しく返せる。</li>
				<li>モデルが文章で呼び出しを装うのではなく、構造化されたツール呼び出しを発行できる。</li>
				<li>クライアントがツールを実行した後、その結果が同じ会話の同じ流れへ戻る。</li>
				<li>モデルが結果を受けて作業を続け、最終回答まで到達する。</li>
			</ol>
			<p>その後、私は本当の最小合格条件を、一周するツールループとして定めました。</p>
			{{code:0}}
			<p>このループが完了して初めて、リクエスト、ツール、結果、会話状態がすべて接続されたと言えます。</p>

			<h2>なぜリバースプロキシだけでは足りないのか</h2>
			<p>Claude Code は Anthropic Messages を使います。一方、Catpaw の内部は OpenAI Chat Completions に独自の Agent 会話形式を加えたものに近い構造です。差はフィールド名だけではなく、少なくとも四つの層に分かれます。</p>
			<table>
				<thead><tr><th>層</th><th>変換するもの</th></tr></thead>
				<tbody>
					<tr><td>メッセージ層</td><td><code>system</code>、<code>user</code>、<code>assistant</code>、コンテンツブロック、複数テキスト</td></tr>
					<tr><td>ツール層</td><td><code>tool_use</code>、<code>tool_result</code>、<code>tool_calls</code>、引数の増分、終了理由</td></tr>
					<tr><td>ストリーム層</td><td>OpenAI の SSE chunk と Anthropic のイベント列</td></tr>
					<tr><td>状態層</td><td><code>conversationId</code>、<code>suggestUuid</code>、ワークスペースパス、履歴、認証情報</td></tr>
				</tbody>
			</table>
			<p>第一層だけを処理すれば、チャットはたいてい動きます。しかしツールループ、ストリーム、長時間会話に入ると、残りの問題がまとめて現れます。</p>
			<p>そのため、Thief Neko の構造は次の形に近づきました。</p>
			{{code:1}}
			<p>ここで最も重要な設計判断は、まず共通の中間表現を作り、それから各クライアントと上流を個別に適応させることでした。そうしなければ、プロトコルを一つ増やすたびに既存プロトコルとの相互変換が増え、複雑さが急速に膨らみます。</p>

			<h2>第一歩：構造化された内容を平文に潰さない</h2>
			<p>Anthropic の一つのメッセージには複数のコンテンツブロックを含められます。たとえばアシスタントが文章を出した後に <code>tool_use</code> を発行し、次のユーザーターンが <code>tool_result</code> で実行結果を返します。</p>
			<p>OpenAI 形式へ変換する時の中心的な対応は次の通りです。</p>
			{{code:2}}
			<p>簡略化した変換コードは次のようになります。</p>
			{{code:3}}
			<p>見落としやすい点が二つあります。</p>
			<p>一つ目は、ツール呼び出しの ID をそのまま維持することです。後続のツール結果はこの ID で元の呼び出しを探すため、新しい ID を勝手に作ると次のターンで会話が切れます。</p>
			<p>二つ目は、<code>tool_result</code> を通常のユーザーテキストへ混ぜないことです。モデルは内容を理解できるかもしれませんが、クライアントと上流の両方が「これは特定のツール呼び出しの結果だ」という構造情報を失います。</p>

			<h2>第二歩：ツール呼び出しを状態機械として扱う</h2>
			<p>ツール呼び出しは孤立した JSON ではなく、順序を持つ状態遷移です。</p>
			{{code:4}}
			<p>したがって、ゲートウェイは少なくとも次の状態を記録しなければなりません。</p>
			<ul>
				<li>現在の呼び出しがどの会話に属するか。</li>
				<li>ツール呼び出しの ID、名前、引数。</li>
				<li>ツール結果がどの呼び出しに属するか。</li>
				<li>現在のターンが通常終了か、<code>tool_calls</code> / <code>tool_use</code> 終了か。</li>
				<li>上流が次のターンで必要とする <code>conversationId</code> と <code>suggestUuid</code>。</li>
			</ul>
			<p>初期実装にはこれらの状態が欠けていたため、モデルは「何をしたいか」を示せても、クライアントに実行を引き渡せませんでした。</p>
			<p>リクエスト側には、操作が必要ならクライアントが宣言した関数を必ず使い、文章だけで動作を説明してはならない、というツール契約も加えました。最初のリクエストではツール選択を必須にでき、ツール結果を受け取った後は <code>auto</code> に戻して、続けるか終了するかをモデルに選ばせます。</p>
			<p>これはプロンプトだけでプロトコルを直すためではありません。モデルと変換層に同じ契約を守らせるためです。実際のツール構造は、引き続きゲートウェイ側で検証します。</p>

			<h2>第三歩：SSE はフィールド名ではなくイベント列を再構築する</h2>
			<p>ストリーム出力が二つ目の大きな落とし穴でした。</p>
			<p>OpenAI 形式の API は通常、<code>choices[0].delta</code> を連続して返します。一方 Anthropic は、厳密な順序を持つ SSE イベント列を要求します。</p>
			{{code:5}}
			<p>ツール呼び出しは独立した <code>content_block</code> を使い、引数は <code>input_json_delta</code> で送る必要があります。OpenAI chunk のフィールド名だけを Anthropic 風に変えても、クライアントは正しく認識しません。</p>
			<p>そこで Thief Neko はストリームビルダーを使い、テキスト、ツール引数、終了理由、Token 統計を chunk ごとに収集してから、Anthropic が必要とする順番でイベントを発行します。</p>
			<p>もう一つの問題は、上流の一部が増分ではなく累積スナップショットを返すことでした。</p>
			{{code:6}}
			<p>三つをすべて増分として転送すると、クライアントには次のように見えます。</p>
			{{code:7}}
			<p>この種のストリームでは、まずスナップショットか増分かを識別する必要があります。最も単純な方法は前回と今回の共通接頭辞を比べ、新しく増えた部分だけを送ることです。実環境では、重複段落、空 chunk、ツール引数の分割、スナップショットの後退や書き換えも処理します。</p>
			<p>だからこそストリームプロトコルは独立した状態機械にし、バッファ上限を設けるべきです。上限なしに「ひとまず保存」すると、長時間タスクでは必ずメモリ問題になります。</p>

			<h2>第四歩：パスもプロトコルの一部</h2>
			<p>Claude Code Desktop のツールは Windows ホストで動く場合も、ローカル Agent の仮想ワークスペースで動く場合もあります。そのため、同じファイルに二種類のパスが現れます。</p>
			{{code:8}}
			<p>仮想パスをホスト側の Read / Write / Edit に渡せばファイルが見つかりません。逆に Windows パスを仮想環境の shell へ渡しても失敗します。</p>
			<p>したがってパス変換は全体的な文字列置換ではなく、ツールが動く場所を含めて判断します。</p>
			<ul>
				<li>ホストのネイティブファイルツールは実際の Windows パスを使う。</li>
				<li>仮想環境の shell は <code>/sessions/.../mnt/...</code> のマウントパスを使う。</li>
				<li>正確な対応がなければ推測せず、現在の作業ディレクトリとマウント先を確認する。</li>
				<li>shell コマンド文字列はむやみに書き換えない。引用符とエスケープを壊しやすいためです。</li>
			</ul>
			<p>この問題から、プロトコル適応は HTTP 層だけの話ではないと分かりました。<strong>両端が同じ対象を異なる形で表すなら、それはすべてプロトコルの一部です。</strong></p>

			<h2>第五歩：認証情報の更新を single-flight にする</h2>
			<p>ゲートウェイをしばらく動かすと、Claude Code が API Key 無効を表示してログアウトすることがありました。Clash、IP、サービス設定を調べた後、Catpaw のログイン認証情報が実行中に更新されることを確認しました。</p>
			<p>ゲートウェイが古い Token を持ったままだと、上流は 401 を返します。Claude Code はそれをユーザー設定の API Key が失効したと解釈し、開発会話全体を中断します。</p>
			<p>修正は三層に分けました。</p>
			<ol>
				<li>ログイン状態を定期的に読み、新しい Token を見つけたら実行中に差し替える。</li>
				<li>401 を受けたら認証情報を更新し、一度だけ透過的に再試行する。</li>
				<li>複数リクエストが同時に 401 を受けても、更新処理は一つだけ実行する。</li>
			</ol>
			<p>三つ目は特に重要です。十件の失敗が同時に十回更新すると、資源を浪費するだけでなく、互いの状態を上書きする可能性があります。簡略化した single-flight は次の通りです。</p>
			{{code:9}}
			<p>ここでは二種類の 401 も区別します。</p>
			<ul>
				<li>失敗したリクエストがすでに古い Token を使っていたなら、別のリクエストが更新済みなので新しい Token で再試行する。</li>
				<li>現在の Token も拒否された時だけ、新しい更新処理を始める。</li>
			</ul>
			<p>新しい認証情報を一時的に取得できない時、ゲートウェイは上流の 401 をそのまま返さず、一時的な 503 を返します。503 は「サービスが一時的に使えず、後で再試行できる」、401 は「永続的な設定が間違っている」という意味です。正しいエラーの意味も互換性の一部です。</p>
			<p>Windows 版はその後 DPAPI でログインセッションを保存し、Linux 版は AES-256-GCM で暗号化して、独立した認証情報サービスからゲートウェイへ渡すようになりました。これで Thief Neko は Catpaw デスクトップを常時起動しなくても動きます。</p>

			<h2>第六歩：長時間タスクではすべての状態に境界を設ける</h2>
			<p>五分のテストが通っても、一時間から三時間続く Agent タスクが安定するとは限りません。</p>
			<p>長時間タスクは、上限のないあらゆるデータ構造を拡大します。会話 Map、ツール引数バッファ、リクエスト履歴、ストリームバッファ、活動一覧、ログファイルです。そこで各資源に明確な境界を設定しました。</p>
			<p>現在のおおよその既定値は次の通りです。</p>
			<table>
				<thead><tr><th>資源</th><th>既定上限</th></tr></thead>
				<tbody>
					<tr><td>Agent 会話</td><td>128</td></tr>
					<tr><td>会話の生存時間</td><td>6 時間</td></tr>
					<tr><td>リクエスト本文</td><td>10 MiB</td></tr>
					<tr><td>履歴コンテキスト</td><td>256 KiB</td></tr>
					<tr><td>ストリームバッファ</td><td>4 MiB</td></tr>
					<tr><td>最近の活動記録</td><td>100 件</td></tr>
					<tr><td>ログファイル</td><td>1 個 10 MiB、3 個保持</td></tr>
				</tbody>
			</table>
			<p>履歴圧縮も、単純に最古のメッセージを削除してはいけません。ツール呼び出しと結果は対になっているため、片方だけ消すと残った履歴が不正になります。</p>
			<p>Thief Neko の圧縮規則は次の通りです。</p>
			<ul>
				<li>モデルが目的を忘れないよう、システム指示と最初のタスクを保持する。</li>
				<li>最近の完全なツール呼び出しと結果を優先して残す。</li>
				<li>ツールの対は一組として削除または保持する。</li>
				<li>大きなツール結果は先頭と末尾の要約だけを残す。</li>
				<li>完全な出力はディスクへ保存し、必要な時にツールで読み直す。</li>
			</ul>
			<p>この管理は直接機能を増やしませんが、ゲートウェイが「デモで動く」段階から「日常で使える」段階へ進めるかを決めます。</p>

			<h2>失敗は無限再試行ではなく、識別する</h2>
			<p>長い会話では、さらに典型的な退化が見つかりました。</p>
			<ul>
				<li>Windows パス末尾のバックスラッシュでツール引数の JSON が不完全になる。</li>
				<li>モデルが同じ誤った引数で再試行し続ける。</li>
				<li>ツールオブジェクトが誤って <code>[object Object]</code> になる。</li>
				<li>モデルが読み取り検索だけを繰り返し、ファイルを変更しない。</li>
				<li>ツール呼び出しが通常テキストのタグとして出力される。</li>
			</ul>
			<p>たとえばモデルが次の内容を出すことがあります。</p>
			{{code:10}}
			<p>見た目はツール呼び出しですが、実際には通常テキストです。似た書式を見ただけで実行すると、ユーザーの記事やコード例まで誤認する危険があります。</p>
			<p>現在の復元条件は、ツール名がクライアントによって実際に宣言され、引数タグが完全で、解析した構造がツール schema を通ることです。一つでも満たさなければ、通常テキストのまま残します。</p>
			<p>失敗の繰り返しには回復予算も必要です。v0.2.3 以降は壊れたターンを除去して自動回復できるのは一度だけです。同種のエラーが続けばローカルループを止め、理由をユーザーへ返します。無限再試行は積極的に見えて、実際には枠を消費し続けるだけです。</p>

			<h2>バージョンの背後にある問題の流れ</h2>
			<p>振り返ると、各バージョンは孤立したバグではなく、新しい信頼性の層を解決していました。</p>
			<table>
				<thead><tr><th>バージョン</th><th>解決した問題</th></tr></thead>
				<tbody>
					<tr><td>v0.1.0</td><td>Anthropic Messages、ファイルツール、Windows パス、デスクトップコントローラー</td></tr>
					<tr><td>v0.2.0</td><td>独立ログイン、Linux サービス、Responses、New API 接続</td></tr>
					<tr><td>v0.2.2</td><td>namespace shell 引数、末尾バックスラッシュ、重複エラーの識別</td></tr>
					<tr><td>v0.2.3</td><td>壊れたターンの除去と回数制限付き自動回復</td></tr>
					<tr><td>v0.2.4</td><td>オブジェクトの直列化と読み取り検索だけを続けるループ</td></tr>
					<tr><td>v0.2.5</td><td>長大な履歴の圧縮と途中で切れた JSON の修復</td></tr>
				</tbody>
			</table>
			<p>この流れから、より合理的な開発順序も見えてきます。</p>
			<ol>
				<li>まず非ストリームのテキスト変換を完成させる。</li>
				<li>次に一周するツール呼び出しを完成させる。</li>
				<li>その後でストリームイベントとツール引数の増分を実装する。</li>
				<li>続いて会話、パス、認証情報の状態を加える。</li>
				<li>最後に長時間タスクで資源漏れと退化ループを探す。</li>
			</ol>
			<p>最初から全プロトコルと全クライアントを同時に支えようとすると、どの層で失敗したのか分かりません。能力を一層ずつ増やせば、失敗を特定しやすくなります。</p>

			<h2>テストは実装詳細ではなく契約を中心にする</h2>
			<p>現在の Thief Neko のテストは、ある関数が何回呼ばれたかより、プロトコル出力がクライアント契約を満たすかを重視しています。</p>
			<ul>
				<li>Anthropic メッセージを OpenAI メッセージへ正しく変換できるか。</li>
				<li><code>tool_use</code> と <code>tool_result</code> が同じ ID を維持するか。</li>
				<li>ストリームイベント列が完全か。</li>
				<li>分割されたツール引数を正しい JSON に組み立てられるか。</li>
				<li>累積スナップショットが重複テキストを作らないか。</li>
				<li>並行 401 が認証情報の更新を一度だけ起動するか。</li>
				<li>リクエスト、履歴、ストリーム上限を超えた時に明確に失敗するか。</li>
				<li>サーバーが実際のツールループを完了できるか。</li>
			</ul>
			<p>ローカル開発では、まず次を実行します。</p>
			{{code:11}}
			<p>ただし自動テストの後も、実ワークスペースを使った端から端までの確認を行います。パス対応、デスクトップクライアントのイベント順序、長時間会話の回復は、単体テストだけでは完全に覆いにくいためです。</p>
			<p>実用的な回帰タスクには Read、Write、Edit、shell、最終結果の検査をすべて含めるべきです。「ツールを使えますか」と聞き、モデルが「使えます」と答えても、検証にはなりません。</p>

			<h2>もう一度始めるなら、もっと早く行うこと</h2>
			<p>第一に、変換コードを書く前にプロトコル状態図を描きます。メッセージ構造だけなら単純でも、ツール、ストリーム、会話が重なると、その場しのぎの条件分岐はすぐ制御不能になります。</p>
			<p>第二に、すべてのリクエストへ全経路を貫く ID を付けます。ログからクライアントリクエスト、上流会話、ツール呼び出し、再試行を一本につなげられるようにし、同時に Token、Cookie、ツール出力はマスクします。</p>
			<p>第三に、初日から失敗サンプルを保存します。実際に壊れた SSE chunk は、十個の推測より価値があります。匿名化して固定テストにすれば、次のバージョンで同じ修正が壊れるのを防げます。</p>
			<p>第四に、回復予算を明確にします。自動修復は必ず、最大再試行回数、消してよい状態、停止すべき時点の三点に答えなければなりません。</p>
			<p>第五に、長時間テストを早く始めます。プロトコルゲートウェイで最も難しいエラーは第一ターンではなく、数十回目のツール呼び出し、最初の Token 更新、履歴が上限に近づいた時に起こります。</p>

			<h2>最後に分かったこと</h2>
			<p>今振り返ると、Thief Neko は従来の意味でのリバースプロキシではありません。異なる API の構造契約を維持しながら、Agent 会話の意味的な連続性も守る、状態を持ったプロトコル翻訳器です。</p>
			<p>本当に難しいのはフィールド A をフィールド B へ変えることではありません。どのツールが実行中か、結果がどのターンに属するか、いつ続けるべきか、いつ回復できるか、そしていつ止めなければならないかを、常に把握することです。</p>
			<p>モデルに「返答」させるのは簡単です。異なるクライアント、プロトコル、実行環境を越えて、継続的かつ確実に「仕事を完了」させることこそ、このプロジェクトが本当に解いた問題でした。</p>
			<p>プロジェクト：<a href="https://github.com/KanoNoUta/thief-neko">KanoNoUta/thief-neko</a></p>
		`, Array.from({ length: 12 }, (_, index) => index)),
		en: withCodeBlocks(`
			<p>At the beginning, all I had was a batch of GLM-5.2 calls provided by Catpaw.</p>
			<p>My goal was straightforward: connect those calls to Claude Code so the model could do more than answer questions. It should be able to inspect a project, modify files, run commands, and finish an entire development task.</p>
			<p>I assumed a reverse proxy would be enough: forward requests from Claude Code to Catpaw, then return the response unchanged. Once I started, I found that although both sides were calling a large language model, they did not speak the same protocol language.</p>
			<p>That small proxy eventually grew into <strong>Thief Neko</strong>, a stateful protocol gateway that supports Anthropic Messages, OpenAI Chat Completions, and OpenAI Responses.</p>
			<p>This article is not only a record of what it does. It also tries to answer a more useful question: <strong>how do you tell whether an LLM gateway actually works, rather than merely returns text?</strong></p>

			<h2>Define What “Working” Means First</h2>
			<p>When the gateway returned model text for the first time, I thought most of the work was done.</p>
			<p>The moment Claude Code entered a tool-calling flow, the problem became obvious. The model would say, “I will inspect the project,” print something that looked like an action plan, and stop. A Catpaw call had been consumed, but Claude Code had not executed anything.</p>
			<p>This showed that “the model replied” is only the weakest form of success. For an agent client, at least four things need to be verified in order.</p>
			<ol>
				<li>Ordinary text is returned correctly.</li>
				<li>The model emits a structured tool call instead of describing one in prose.</li>
				<li>After the client executes the tool, its result returns to the same conversation turn.</li>
				<li>The model continues from that result until it produces a final answer.</li>
			</ol>
			<p>I later defined the real minimum acceptance test as a complete tool loop.</p>
			{{code:0}}
			<p>Only after this loop completed could I say that requests, tools, results, and conversation state were all connected.</p>

			<h2>Why a Reverse Proxy Is Not Enough</h2>
			<p>Claude Code uses Anthropic Messages. Catpaw is closer to OpenAI Chat Completions combined with its own Agent conversation format. The difference is not just field names; it spans at least four layers.</p>
			<table>
				<thead><tr><th>Layer</th><th>What must be translated</th></tr></thead>
				<tbody>
					<tr><td>Messages</td><td><code>system</code>, <code>user</code>, <code>assistant</code>, content blocks, and multipart text</td></tr>
					<tr><td>Tools</td><td><code>tool_use</code>, <code>tool_result</code>, <code>tool_calls</code>, argument deltas, and finish reasons</td></tr>
					<tr><td>Streaming</td><td>OpenAI SSE chunks and Anthropic event sequences</td></tr>
					<tr><td>State</td><td><code>conversationId</code>, <code>suggestUuid</code>, workspace paths, history, and credentials</td></tr>
				</tbody>
			</table>
			<p>If you only handle the first layer, chat will usually work. The remaining problems arrive together as soon as tools, streaming, or long-running sessions are involved.</p>
			<p>That is why Thief Neko evolved toward this structure.</p>
			{{code:1}}
			<p>The most important design choice was to establish a normalized intermediate representation first, then adapt each client and upstream service separately. Otherwise, every new protocol requires pairwise conversions with all existing protocols, and complexity grows rapidly.</p>

			<h2>Step One: Do Not Flatten Structured Content into Text</h2>
			<p>A single Anthropic message can contain several content blocks. An assistant may emit text followed by a <code>tool_use</code>, while the next user turn returns the execution result in a <code>tool_result</code>.</p>
			<p>The central mappings into OpenAI format look like this.</p>
			{{code:2}}
			<p>A simplified converter can be written as follows.</p>
			{{code:3}}
			<p>Two details are easy to miss.</p>
			<p>First, the tool-call ID must be preserved exactly. The later tool result uses that ID to find its call; generating a new ID breaks the conversation on the next turn.</p>
			<p>Second, do not append a <code>tool_result</code> to ordinary user text. The model may still understand the words, but both the client and upstream service lose the structural fact that this is the result of a specific tool call.</p>

			<h2>Step Two: Treat Tool Calls as a State Machine</h2>
			<p>A tool call is not an isolated JSON object. It is an ordered state transition.</p>
			{{code:4}}
			<p>The gateway therefore needs to track at least the following information.</p>
			<ul>
				<li>Which conversation owns the current call.</li>
				<li>The tool-call ID, name, and arguments.</li>
				<li>Which call a tool result belongs to.</li>
				<li>Whether the turn ended normally or with <code>tool_calls</code> / <code>tool_use</code>.</li>
				<li>The <code>conversationId</code> and <code>suggestUuid</code> required by the upstream service on the next turn.</li>
			</ul>
			<p>The early implementation lacked this state. The model could express what it intended to do, but it could not hand execution over to the client.</p>
			<p>On the request side, I also added an explicit tool contract: when an action is needed, the model must use a function declared by the client and must not merely describe the action in text. The first request can require a tool; after a tool result arrives, the mode returns to <code>auto</code> so the model can either continue or finish.</p>
			<p>This is not an attempt to repair the protocol with prompting. It makes the model and translation layer follow the same contract. The gateway still validates the actual tool structure.</p>

			<h2>Step Three: Rebuild SSE Events Instead of Renaming Fields</h2>
			<p>Streaming output was the second major trap.</p>
			<p>An OpenAI-style API usually keeps returning <code>choices[0].delta</code>. Anthropic expects a strict sequence of SSE events.</p>
			{{code:5}}
			<p>Tool calls also need their own <code>content_block</code>, with arguments sent through <code>input_json_delta</code>. Renaming fields on OpenAI chunks is not enough for the client to understand them.</p>
			<p>Thief Neko therefore uses a stream builder. It gathers text, tool arguments, finish reasons, and token usage chunk by chunk, then emits events in the order Anthropic expects.</p>
			<p>There was another problem: some upstream streaming content was a cumulative snapshot rather than a delta.</p>
			{{code:6}}
			<p>If all three chunks are forwarded as deltas, the client sees this.</p>
			{{code:7}}
			<p>For this kind of stream, the gateway must first determine whether content is a snapshot or a delta. The simplest approach compares the common prefix of the previous and current chunks and emits only the new suffix. A real implementation must also handle repeated paragraphs, empty chunks, split tool arguments, and snapshots that move backward or rewrite earlier text.</p>
			<p>This is why streaming deserves its own state machine and bounded buffers. An unbounded “store it for now” strategy inevitably turns into a memory problem during long tasks.</p>

			<h2>Step Four: Paths Are Part of the Protocol</h2>
			<p>Claude Code Desktop tools may run on the Windows host or inside the local Agent's virtual workspace. The same file can therefore have two paths.</p>
			{{code:8}}
			<p>If a virtual path is given to host-side Read / Write / Edit, the file cannot be found. If a Windows path is given to a shell inside the virtual environment, that fails too.</p>
			<p>Path conversion cannot be a global string replacement. It must know where the tool runs.</p>
			<ul>
				<li>Native host file tools use real Windows paths.</li>
				<li>The virtual shell uses <code>/sessions/.../mnt/...</code> mount paths.</li>
				<li>When there is no exact mapping, inspect the current working directory and mounts instead of guessing.</li>
				<li>Do not rewrite shell command strings casually; quoting and escaping are easy to break.</li>
			</ul>
			<p>This taught me that protocol adaptation does not stop at HTTP. <strong>Whenever two ends represent the same thing differently, that representation is part of the protocol.</strong></p>

			<h2>Step Five: Make Credential Refresh Single-Flight</h2>
			<p>After the gateway had been running for a while, Claude Code would occasionally report an invalid API key and log out. After checking Clash, IP changes, and service configuration, I confirmed that Catpaw login credentials refresh while the program is running.</p>
			<p>If the gateway still holds the old token, the upstream service returns 401. Claude Code interprets that as an invalid user-configured API key and interrupts the entire development session.</p>
			<p>The fix has three layers.</p>
			<ol>
				<li>Poll the login state and hot-swap a newly discovered token.</li>
				<li>On 401, refresh credentials and transparently retry once.</li>
				<li>When several requests receive 401 at the same time, allow only one refresh operation to run.</li>
			</ol>
			<p>The third point matters. Ten failed requests refreshing ten times wastes resources and can cause state to overwrite itself. The simplified single-flight logic looks like this.</p>
			{{code:9}}
			<p>This also distinguishes two kinds of 401.</p>
			<ul>
				<li>If the failed request used an already outdated token, another request has refreshed it, so retry with the new token.</li>
				<li>Only start another refresh when the currently installed token is also rejected.</li>
			</ul>
			<p>If new credentials are temporarily unavailable, the gateway returns a temporary 503 instead of passing the upstream 401 through. A 503 means the service is temporarily unavailable and may be retried; a 401 tells the client that its persistent configuration is wrong. Correct error semantics are part of compatibility.</p>
			<p>The Windows version later stored login sessions with DPAPI. The Linux version uses AES-256-GCM encryption and exposes credentials to the gateway through an independent credential service. Thief Neko no longer needs the Catpaw desktop application to stay open.</p>

			<h2>Step Six: Bound Every Piece of State in Long Tasks</h2>
			<p>A five-minute test passing does not mean an Agent task lasting one to three hours will remain stable.</p>
			<p>Long tasks amplify every unbounded data structure: session maps, tool-argument buffers, request history, stream buffers, activity lists, and log files. I gave every resource an explicit boundary.</p>
			<p>The current defaults are approximately as follows.</p>
			<table>
				<thead><tr><th>Resource</th><th>Default limit</th></tr></thead>
				<tbody>
					<tr><td>Agent sessions</td><td>128</td></tr>
					<tr><td>Session lifetime</td><td>6 hours</td></tr>
					<tr><td>Request body</td><td>10 MiB</td></tr>
					<tr><td>Conversation history</td><td>256 KiB</td></tr>
					<tr><td>Stream buffer</td><td>4 MiB</td></tr>
					<tr><td>Recent activity records</td><td>100</td></tr>
					<tr><td>Log files</td><td>10 MiB each, 3 retained</td></tr>
				</tbody>
			</table>
			<p>History compaction cannot simply delete the oldest message. A tool call and its result form a pair; deleting only one side leaves invalid history behind.</p>
			<p>Thief Neko uses these compaction rules.</p>
			<ul>
				<li>Keep the system instructions and initial task so the model does not forget its objective.</li>
				<li>Prefer the most recent complete tool calls and results.</li>
				<li>Keep or remove a tool pair as a unit.</li>
				<li>Retain only head and tail summaries for large tool results.</li>
				<li>Persist full output to disk so a tool can read it again when needed.</li>
			</ul>
			<p>This work does not add a visible feature, but it determines whether the gateway moves from “works in a demo” to “works every day.”</p>

			<h2>Recognize Failure Instead of Retrying Forever</h2>
			<p>Long sessions exposed several recurring forms of degradation.</p>
			<ul>
				<li>A trailing backslash in a Windows path leaves tool-argument JSON incomplete.</li>
				<li>The model repeatedly retries the same invalid arguments.</li>
				<li>A tool object is accidentally serialized as <code>[object Object]</code>.</li>
				<li>The model remains in a read-only search loop and never modifies a file.</li>
				<li>A tool call appears as tags inside ordinary text.</li>
			</ul>
			<p>For example, the model occasionally emits this.</p>
			{{code:10}}
			<p>It looks like a tool call, but it is ordinary text. Executing every similar pattern would also misclassify examples in a user's article or source code.</p>
			<p>The current recovery rule requires the tool name to be declared by the client, the argument tags to be complete, and the parsed structure to pass the tool schema. If any condition fails, the content remains text.</p>
			<p>Repeated failures also need a recovery budget. Since v0.2.3, Thief Neko may clear a bad turn and recover automatically only once. If the same class of error continues, it stops the local loop and returns the reason to the user. Infinite retries look active but only keep consuming calls.</p>

			<h2>The Problem Line Behind Each Version</h2>
			<p>Looking back, each release addressed a new layer of reliability rather than an isolated bug.</p>
			<table>
				<thead><tr><th>Version</th><th>Problem addressed</th></tr></thead>
				<tbody>
					<tr><td>v0.1.0</td><td>Anthropic Messages, file tools, Windows paths, and the desktop controller</td></tr>
					<tr><td>v0.2.0</td><td>Independent login, Linux service, Responses, and New API integration</td></tr>
					<tr><td>v0.2.2</td><td>Namespaced shell arguments, trailing backslashes, and repeated-error detection</td></tr>
					<tr><td>v0.2.3</td><td>Bad-turn cleanup and bounded automatic recovery</td></tr>
					<tr><td>v0.2.4</td><td>Object serialization and persistent read-only search loops</td></tr>
					<tr><td>v0.2.5</td><td>Oversized-history compaction and truncated JSON repair</td></tr>
				</tbody>
			</table>
			<p>This sequence also suggests a more practical implementation order.</p>
			<ol>
				<li>Finish non-streaming text conversion first.</li>
				<li>Then complete one full tool-call loop.</li>
				<li>Implement streaming events and tool-argument deltas next.</li>
				<li>Add session, path, and credential state.</li>
				<li>Finally, use long-running tasks to find leaks and degraded loops.</li>
			</ol>
			<p>Trying to support every protocol and every client at once makes it hard to identify which layer failed. Adding one capability at a time keeps failures local and understandable.</p>

			<h2>Test Contracts, Not Implementation Details</h2>
			<p>Thief Neko's current tests focus less on how many times a function was called and more on whether protocol output satisfies the client's contract.</p>
			<ul>
				<li>Can Anthropic messages be mapped correctly to OpenAI messages?</li>
				<li>Do <code>tool_use</code> and <code>tool_result</code> preserve their ID pairing?</li>
				<li>Is the streaming event sequence complete?</li>
				<li>Can split tool arguments be assembled into valid JSON?</li>
				<li>Do cumulative snapshots avoid producing duplicate text?</li>
				<li>Do concurrent 401 responses trigger only one credential refresh?</li>
				<li>Does exceeding request, history, or stream limits fail explicitly?</li>
				<li>Can the server complete a real tool loop?</li>
			</ul>
			<p>Local development starts with this command.</p>
			{{code:11}}
			<p>After the automated tests, I still run an end-to-end task against a real workspace. Path mapping, desktop-client event ordering, and long-session recovery are difficult to cover completely with unit tests alone.</p>
			<p>A useful regression task should include Read, Write, Edit, shell, and a final result check. Asking “can you use tools?” and receiving “yes” proves nothing.</p>

			<h2>What I Would Do Earlier If I Started Again</h2>
			<p>First, draw the protocol state diagram before writing converters. Message structures look simple, but tools, streams, and sessions quickly turn ad hoc conditionals into an unmanageable system.</p>
			<p>Second, assign every request an ID that spans the whole path. Logs should connect the client request, upstream conversation, tool calls, and retries while redacting tokens, cookies, and tool output.</p>
			<p>Third, save failure samples from day one. One real broken SSE chunk is usually worth more than ten guesses. Once anonymized and turned into a fixture, it prevents the same fix from regressing in the next version.</p>
			<p>Fourth, define a recovery budget. Every automatic repair should answer three questions: how many retries are allowed, which state may be discarded, and when the system must stop.</p>
			<p>Fifth, begin long-duration tests early. The hardest gateway bugs rarely happen on the first turn. They appear after dozens of tool calls, during the first token refresh, or when history approaches its limit.</p>

			<h2>What I Understand Now</h2>
			<p>Looking back, Thief Neko is no longer a reverse proxy in the traditional sense. It is a stateful protocol translator that maintains both the structural contracts of several APIs and the semantic continuity of an Agent conversation.</p>
			<p>The hard part is not renaming field A to field B. It is always knowing which tool is running, which turn owns a result, when to continue, when recovery is safe, and when the gateway must stop.</p>
			<p>Making a model “reply” is easy. Making it reliably “finish the work” across different clients, protocols, and execution environments is the real problem this project solves.</p>
			<p>Project: <a href="https://github.com/KanoNoUta/thief-neko">KanoNoUta/thief-neko</a></p>
		`, Array.from({ length: 12 }, (_, index) => index)),
	},
	'webtimeline-development-diary': {
		ja: withCodeBlocks(`
			<blockquote><p>WebTimeline は現在も初期開発段階です。この記事は最初のプロトタイプから、編集の一連の流れが使えるようになるまでを記録したもので、最終的な製品形態を示すものではありません。</p></blockquote>

			<h2>なぜ WebTimeline を作るのか</h2>
			<p>PromeRotation のタイムラインは強力ですが、本当に使える一本を作るのは簡単ではありません。</p>
			<p>従来、タイムライン JSON は ACR 作者やプラグイン構造に詳しいプレイヤーが直接保守することが多く、なぜこの時刻にスキルが発動するのか、どのフェーズか、対象は誰か、CD が衝突しないかといった情報がフィールド、条件、ネスト構造の中に隠れていました。普通のプレイヤーにとっては、軽減を数秒前へ動かすだけでも設定全体を理解する必要があります。</p>
			<p>私が解決したかったのは、別のタイムライン形式を作ることではありません。既存形式を、見て、ドラッグして、確認できる画面へ変えることでした。</p>
			<ul>
				<li>初心者は Boss の基準タイムラインと ACR シミュレーションをそのまま確認できる。</li>
				<li>微調整したい人はスキルを移動し、時刻と対象を変更できる。</li>
				<li>既存タイムラインをインポートし、編集後は再びプラグインで使える。</li>
				<li>複雑なロジックはシステムが扱い、ユーザーは時間とスキルだけを考えればよい。</li>
			</ul>
			<p>これが WebTimeline の最初の目標です。コード寄りだったタイムライン作成を、本当のタイムラインエディターへ変えます。</p>

			<h2>第一段階：まずタイムラインを「見える」ようにする</h2>
			<p>2026 年 7 月 8 日、WebTimeline の最初のプロトタイプがリポジトリに入りました。</p>
			<p>初期版でも Boss イベント、プレイヤースキル、フェーズ情報を横方向のタイムラインへ並べられましたが、まだエディターというよりデータ表示ページでした。スキルが密集すると重なり、Boss の詠唱、ダメージ判定、終了時刻が混み合い、右カラムも主タイムラインの空間を取りすぎていました。</p>
			<p>最初の改修ではページを増やさず、主画面の情報構造を先に決めました。タイムラインを「インポート、手動、ACR」というデータの出所ではなく、実際の用途で整理します。</p>
			<ul>
				<li>Boss の詠唱とダメージ</li>
				<li>オープナー</li>
				<li>火力タイムライン</li>
				<li>軽減とヒール</li>
				<li>バースト</li>
				<li>QT 制御</li>
				<li>ACR シミュレーション</li>
				<li>注目スキル</li>
			</ul>
			<p>出所は表示しますが、ラベルとスタイルに留めます。編集者にとって大切なのは「このスキルは何をするか」であり、「どのコードから来たか」ではないためです。</p>
			<p>全体表示と P1 から P5 の切り替えも加えました。各フェーズは独自の時間範囲を持ち、画面では相対時刻、内部では戦闘全体の絶対時刻を保存します。この制約は後のドラッグ編集の基礎にもなりました。P3 のスキルは P3 内だけで調整でき、隣のフェーズへ漂流しません。</p>

			<h2>第二段階：実際の PromeRotation タイムラインに対応する</h2>
			<p>ユーザーファイルを読み始めると、最初の大きな問題がすぐ現れました。「タイムライン JSON」には一つの構造しかないわけではありません。</p>
			<p>現在、プロジェクトは三種類のデータを扱います。</p>
			<ol>
				<li>従来の PromeRotation トリガータイムライン。</li>
				<li>PTL タイムライン。</li>
				<li>WebTimeline 独自のプロジェクト形式。</li>
			</ol>
			<p>従来形式には Meta、Root、トリガー条件、並列分岐、アクションノードがあります。PTL はアンカー、オフセット、フェーズ構造への依存が強く、両方を単純に再帰展開すると表示はできても時刻がずれることがあります。特に PTL の技術的アンカーは、ユーザーが見るフェーズ境界と一致するとは限りません。</p>
			<p>そこでインポート層を二段に分けました。まず形式を識別し、次にエディター内部イベントへ正規化します。内部イベントは少なくともスキル ID、名前、時刻、フェーズ、分類、出所、継続時間、対象を持ちます。欠けたフィールドには既定値を入れ、認識できないジョブや ACR があっても閲覧自体は止めません。</p>
			<p>エクスポートには二つの経路を残しました。</p>
			<ul>
				<li>ネイティブ PromeRotation タイムラインとして出力し、インポート時の Meta、Root、PTL 原文をできるだけ保持する。</li>
				<li>WebTimeline プロジェクトとして出力し、現在の編集状態を完全に保存して後から続けられるようにする。</li>
			</ul>
			<p>この部分で最も重要な原則は、往復してもデータを失わないことです。WebTimeline はファイルを読み込むだけでなく、編集結果を元の作業フローへ安全に戻せなければなりません。</p>

			<h2>第三段階：ブラウザを本当のエディターにする</h2>
			<p>表示できるようになった次の課題は、誤操作をどう防ぐかでした。</p>
			<p>WebTimeline は既定で閲覧モードに入ります。このモードではスキルをドラッグできず、クリックしても詳細表示や右側一覧での位置確認だけを行います。編集モードへ切り替えると、手動スキルと編集可能なインポートスキルだけが解除され、Boss スキルと ACR 自動シミュレーションはロックされたままです。</p>
			<p>単純な区別に見えますが、ドラッグ監視、削除ボタン、時刻入力、スキル挿入パネル、対象選択のほぼすべてが現在のモードに従う必要があります。</p>

			<h3>フローティングスキル挿入パネル</h3>
			<p>スキル挿入は編集モードだけで有効になるフローティングツールにしました。編集中のフェーズを隠さないようパネル自体を移動でき、スキルライブラリは現在のジョブに関係するものだけを、すべて、火力、軽減、薬、60 秒バースト、120 秒バースト、QT に分類して表示します。</p>
			<p>スキル ID 入力も残しましたが、名前の再入力は不要です。有効な ID を入れると、データベースから名前とアイコンを自動で対応させます。</p>

			<h3>ドラッグは left の値を変えるだけではない</h3>
			<p>ドラッグ機能は何度も作り直しました。</p>
			<p>当初はブラウザ標準の drag and drop を使いましたが、長い軽減バーでは不安定でした。ドラッグ中にタイムライン全体を再描画するとスクロール位置も跳びます。その後 Pointer Events の経路を追加し、高頻度のガイド更新を <code>requestAnimationFrame</code> に移しました。ドラッグ開始時にトラックと時間換算コンテキストをキャッシュし、移動中はガイド線、時刻バブル、隣接イベントとの差だけを更新し、離した時にデータを確定します。</p>
			<p>現在はスキルを動かす時、画面が同時に次を表示します。</p>
			<ul>
				<li>配置予定の正確な時刻。</li>
				<li>近くのスキルとの秒差。</li>
				<li>現在フェーズで許される時間境界。</li>
				<li>現在のトラックがこの種類のスキルを受け入れるか。</li>
			</ul>
			<p>割合の位置を勘で当てるのではなく、動画編集ソフトに近い操作感になりました。</p>

			<h3>CD 検証はゲームのロジックに従う</h3>
			<p>ドラッグできるだけでは足りません。CD が戻っていない時刻へスキルを置けるなら、生成したタイムラインには意味がありません。</p>
			<p>WebTimeline はスキル ID、共有 CD キー、チャージ数、リキャスト時間からキューを検査します。不正な時刻へ挿入すると、手動キューは衝突を表示するか、使用可能時刻まで遅らせます。既存スキルの検査では移動中のスキル自身を除き、未来にある同名スキルが現在のスキルを前へ動かすのを逆に妨げないようにします。</p>
			<p>オープナーも CD の基準へ含めます。そうしなければカウントダウンや開幕で使ったスキルが、P1 に入った直後に再び使えると誤判定されます。この種の問題はページエラーを出さずにタイムラインの信頼性を壊すため、専用の回帰テストを追加しました。</p>

			<h2>第四段階：軽減には時刻だけでなく対象がある</h2>
			<p>火力スキルの対象は通常 Boss を既定にできますが、軽減、回復、無敵、支援スキルは同じ扱いにできません。</p>
			<p>自分への無敵、味方への単体軽減、Boss を対象にする Reprisal は、同じ軽減トラックにあっても対象規則が違います。そこで対象をタイムラインイベントの第一級フィールドにしました。</p>
			<ul>
				<li>攻撃スキルは既定で Boss を対象にする。</li>
				<li>軽減、回復、無敵は対象の確認を求める。</li>
				<li>支援型軽減では Boss を選べない。</li>
				<li>外部から取り込んだ軽減も詳細欄で対象を編集できる。</li>
			</ul>
			<p>対象が必要なスキルを置くと、選択パネルがそのスキルに追従して現れます。タイムラインコンテナに切られないよう、最終的には固定配置のオーバーレイへ変更し、再描画時も横スクロール位置を維持します。</p>
			<p>小さな UI ですが、インポート、編集、分類、エクスポートの四工程をつないでいます。これがなければ時刻が正しくても、実行対象が間違う可能性があります。</p>

			<h2>第五段階：ACR データを接続する</h2>
			<p>WebTimeline は PromeRotation から独立した別のスキル表ではなく、現在のジョブと ACR を理解する必要があります。</p>
			<p>データ生成処理は PromeRotation 本体のソース、プレイヤーがアップロードした ACR パッケージ、必要な解析結果を読み、フロントエンド用の ACR データベースを作ります。ジョブ、ACR 名、作者、対応状態、スキル、QT コントロール、生成時刻を記録します。</p>
			<p>これによりエディターは次のことができます。</p>
			<ul>
				<li>インポートしたタイムラインからジョブと ACR を自動認識する。</li>
				<li>現在のジョブ向けスキル挿入一覧を提供する。</li>
				<li>手書き火力タイムラインがない時に ACR シミュレーションを生成する。</li>
				<li>特定作者向けのハードコードではなく、ACR から QT コントロールを発見する。</li>
				<li>ACR シミュレーション、インポートイベント、手動イベントを区別する。</li>
			</ul>
			<p>QT は当初、火力とバーストのトラックへ散らばっていましたが、後に独立トラックへまとめました。近い時刻にある QT 状態は一つのアイコンへ収納し、クリック後に各スイッチを確認できるため、同じコントロールが一列を埋めません。</p>
			<p>60 秒と 120 秒のバーストも画面外の設定ではなく、「バーストパック」として主タイムラインへ参加します。初心者には開始時刻、スキル数、出所を見せ、細かく調整する時だけ中身を展開します。</p>

			<h2>第六段階：注目、追跡、ページ全体の一覧</h2>
			<p>「スキルを注目する」と「スキルへ移動する」は一時期混同されていました。</p>
			<p>現在は二つの異なる操作として定義しています。</p>
			<ul>
				<li>注目スキルは永続的な追跡リストで、同じスキルが全体タイムラインに現れる時刻と出所を集約する。</li>
				<li>追跡は一度だけの位置合わせ。右側のスキルを押すと主タイムライン上の対応スキルが強調され、主タイムライン側を押すと右側一覧の対応イベントが展開される。</li>
			</ul>
			<p>そのため右カラムは閲覧と追跡だけを担当し、スキル挿入は行いません。「ページ全体一覧」に統一し、Boss、オープナー、火力、軽減、バースト、QT を折りたためます。特定フェーズを見ている時は現在フェーズを優先して探し、理由なく全体表示へ戻りません。</p>
			<p>タイムライン左側にはトラック表示制御も追加しました。Boss、火力、軽減、バーストなどを一時的に隠し、今確認したい内容へ空間を譲れます。</p>

			<h2>第七段階：妖星からより多くの絶レイド Boss タイムラインへ</h2>
			<p>WebTimeline の第一段階は妖星乱舞絶境戦を中心に開発しました。エディターが安定するにつれ、Boss の基準データを拡張し、現在は妖星、絶バハムート、絶アレキサンダー、絶竜詩、絶エデンの基礎タイムラインを取り込んでいます。</p>
			<p>データは主に FFLogs の戦闘イベントから整理しますが、イベントを取得できたことと、正しい基準タイムラインができたことは同じではありません。</p>
			<p>最初は Boss の cast と対応するダメージだけを組み合わせたため、重要な二種類のイベントが抜けました。</p>
			<ol>
				<li>対応する詠唱がなく、直接ダメージを与える Boss スキル。</li>
				<li>ダメージ値はないが、ギミック判定を決める動作や停止イベント。</li>
			</ol>
			<p>現在のデータ生成は三種類の記録を統合します。</p>
			<ul>
				<li>詠唱と対応するダメージを組み合わせたイベント。</li>
				<li>対応する詠唱がない Boss ダメージイベント。</li>
				<li>ダメージは 0 でも、ギミックタイムライン上で意味を持つマーカーイベント。</li>
			</ul>
			<p>同時に自動攻撃、DoT 集計、純粋な視覚動作、味方由来のイベント、明らかなノイズを除外します。新しいスキル名はローカル中国語マッピングへ追加し、タイムラインに英語原名が混ざらないようにします。</p>
			<p>Boss 画像は保守的に扱い、正しい素材がプロジェクトにある時だけ表示します。新しい絶レイドに対応画像がなければ妖星の画像で代用せず、本物の素材を用意してから接続します。</p>

			<h2>第八段階：UI を「機能がある」から「長く使える」へ</h2>
			<p>WebTimeline の画面は一度だけでなく何度も作り直しました。</p>
			<p>初期ページは分割が強く、左ナビ、右ツール、上部情報がそれぞれ空間を取り、主エディターが狭くなっていました。説明用の大きなカードを段階的に取り除き、インポート、エクスポート、ジョブ、ACR、モード、コンテンツ情報を一本の淡色ツールバーへまとめました。左には軽量なアイコントラック、右にはページ全体一覧だけを残しています。</p>
			<p>現在のデザインは温かい明色背景、細い境界線、小さな角丸、控えめな影を使い、Claude / Anthropic 系ツールの雰囲気を参考にしています。美しいポスターを作るためではなく、数百の時刻ノードを長時間見ても階層を判別できるようにするためです。</p>
			<p>目立たなくても何度も調整した細部があります。</p>
			<ul>
				<li>Boss の詠唱、発動、ダメージ、終了情報が重ならない。</li>
				<li>継続軽減の長さは実時間に比例させつつ、文字を引き伸ばさない。</li>
				<li>P5 末尾のイベントはトラック境界で切り、コンテナから飛び出さない。</li>
				<li>近い時刻のプレイヤースキルを視覚的にずらし、一枚のカードへ重ねない。</li>
				<li>上部のミニナビを常に見える位置へ置き、長いタイムラインの下まで探しに行かせない。</li>
				<li>狭い画面では横スクロールを許しつつ、ボタンと文字を読めない幅へ潰さない。</li>
			</ul>
			<p>一つの大機能として説明しづらい作業ですが、エディターがデモか、毎日使える道具かを決めます。</p>

			<h2>テストとデプロイ</h2>
			<p>タイムラインエディターには「見た目は合っているがデータは間違っている」問題が多くあります。そのため、実際の挙動を中心とした回帰テストを段階的に追加しました。</p>
			<ul>
				<li>従来トリガー形式と PTL の識別。</li>
				<li>フェーズアンカー、相対時刻、絶対時刻の換算。</li>
				<li>インポート後の再エクスポートでデータを保持すること。</li>
				<li>編集モードと閲覧モードの分離。</li>
				<li>ポインタードラッグ、スクロール維持、配置ガイド。</li>
				<li>CD 衝突とオープナー基準。</li>
				<li>軽減分類、対象制限、対象選択。</li>
				<li>ACR シミュレーション、QT コントロール、バーストパック。</li>
				<li>Boss 詠唱、ダメージ、0 ダメージのギミックマーカー、中国語名称。</li>
				<li>右側追跡、逆方向の位置合わせ、注目スキル集計。</li>
				<li>タイムライン境界、カード重なり防止、レスポンシブレイアウト。</li>
			</ul>
			<p>この記事の整理時点で全 286 テストが通過し、静的ビルドも成功しています。サイトは静的構築で Cloudflare Pages へ配備し、入口をホームとエディターに分けています。中心データはビルド時に生成するため、ブラウザへ秘密の API 認証情報を保存する必要はありません。</p>

			<h2>この開発で得た重要な理解</h2>
			<h3>1. タイムラインエディターはまずデータ変換器である</h3>
			<p>ドラッグは表面にすぎません。本当に難しいのは PR、PTL、ACR、Boss イベント、WebTimeline 内部モデルの間で意味を保つことです。フェーズ、対象、出所のどれか一つを失えば、後の美しい UI では救えません。</p>
			<h3>2. 出所を主分類にしてはいけない</h3>
			<p>「手動」「インポート」「シミュレーション」はラベルには適しますが、無関係な三本のタイムラインに分けるべきではありません。ユーザーが調整するのは戦闘計画であって、データパイプラインではありません。</p>
			<h3>3. 編集の自由はゲーム規則で制約する</h3>
			<p>スキルを自由に動かせても、不可能な CD、誤った対象、フェーズを越える漂流を許してはいけません。何でも動かせるキャンバスより、信頼できる制約の方が価値があります。</p>
			<h3>4. 実際のサンプルは想像上の形式より複雑</h3>
			<p>暗黒騎士、白魔道士、PTL、プレイヤー ACR、FFLogs Boss イベントが次々に境界条件を露出しました。修正ごとにサンプルとテストを残さなければ、次の UI 変更で古い問題が戻ります。</p>
			<h3>5. UI の空間そのものが機能である</h3>
			<p>タイムラインが長いほど主編集領域は貴重です。サイドバー、説明枠、大見出しを一つ増やすたび、スキル関係を見る空間が減ります。最終的な画面はデータを静かに支え、注意を奪わないべきです。</p>

			<h2>現在どこまでできたか</h2>
			<p>WebTimeline には現在、使える中心ループがあります。</p>
			{{code:0}}
			<p>まだ初期版です。ACT と FFLogs の比較、ダメージ見積もり、より完全なジョブ ACR 対応、複数版のローカル保存、共有表示ページ、モバイル、8 人チーム共同編集には長い道が残っています。</p>
			<p>次の段階ではデータの信頼性を優先します。より多くの絶レイドスキルと中国語名を補い、各ジョブの ACR シミュレーションを改善し、PTL と従来形式の往復互換性を検証し、軽減、QT、バースト編集をプラグインの実際の実行結果へ近づけます。</p>

			<h2>最後に</h2>
			<p>WebTimeline は「タイムラインが何時に何をするかなら、動画編集のように並べられないか」という単純な発想から始まりました。</p>
			<p>開発を続けるほど、可視化は複雑なシステムへきれいな外皮を被せることではないと確信します。JSON、トリガー条件、作者の経験に隠れた規則を、ユーザーが観察し、理解し、変更できるものへ変えることです。</p>
			<p>第一版の完成はまだ遠いですが、「理解できないタイムラインを取り込む」地点から「ブラウザで動かし、検証し、プラグインへ戻す」地点までの道は通りました。</p>
			<p>次は、本当にタイムラインを書くために使いたくなる道具へ磨いていきます。</p>
		`, [0]),
		en: withCodeBlocks(`
			<blockquote><p>WebTimeline is still in an early stage of development. This article records the journey from the first prototype to a usable editing loop; it does not represent the final product.</p></blockquote>

			<h2>Why Build WebTimeline?</h2>
			<p>PromeRotation has a powerful timeline system, but writing a timeline that is genuinely usable is not easy.</p>
			<p>Traditionally, ACR authors or players familiar with the plugin structure maintained timeline JSON directly. Why a skill triggers at a certain point, which phase it belongs to, who it targets, and whether it conflicts with cooldowns are all hidden in fields, conditions, and nested structures. For an ordinary player, even moving one mitigation skill a few seconds earlier requires understanding the entire configuration.</p>
			<p>I did not want to invent another timeline format. I wanted to turn existing formats into an interface that could be seen, dragged, and checked.</p>
			<ul>
				<li>New users can directly inspect the Boss baseline and ACR simulation.</li>
				<li>People making small adjustments can drag skills, edit times, and choose targets.</li>
				<li>Existing timelines can be imported and returned to the plugin after editing.</li>
				<li>The system handles complex logic while the user works with time and skills.</li>
			</ul>
			<p>That became WebTimeline's original goal: turn a code-oriented timeline workflow into a real timeline editor.</p>

			<h2>Stage One: Make the Timeline Visible</h2>
			<p>On July 8, 2026, the first WebTimeline prototype entered the repository.</p>
			<p>It could already place Boss events, player skills, and phase data on a horizontal timeline, but it was closer to a data viewer than an editor. Dense skills overlapped, Boss casts, damage checks, and end times competed for the same space, and the right-hand panel took too much room away from the main timeline.</p>
			<p>The first round of work did not add more pages. It established the information structure of the main screen. Instead of separating tracks by data source such as imported, manual, or ACR, the timeline is now organized by purpose.</p>
			<ul>
				<li>Boss casts and damage</li>
				<li>Opener</li>
				<li>Damage timeline</li>
				<li>Mitigation and healing</li>
				<li>Burst</li>
				<li>QT controls</li>
				<li>ACR simulation</li>
				<li>Watched skills</li>
			</ul>
			<p>The source is still shown, but only as a label and visual style. The editor's important question is “what does this skill do?”, not “which code path produced it?”</p>
			<p>The timeline also gained a full-fight view and P1 through P5 switching. Each phase has its own time range. Skills display relative time inside a phase while the data model stores absolute fight time. That constraint later became the basis for dragging: a P3 skill may move within P3 but cannot drift into a neighboring phase.</p>

			<h2>Stage Two: Support Real PromeRotation Timelines</h2>
			<p>The first major issue appeared as soon as real user files were imported: “timeline JSON” does not have a single structure.</p>
			<p>The project currently handles three kinds of data.</p>
			<ol>
				<li>Traditional PromeRotation trigger timelines.</li>
				<li>PTL timelines.</li>
				<li>WebTimeline's own project format.</li>
			</ol>
			<p>A traditional trigger timeline contains Meta, Root, trigger conditions, parallel branches, and action nodes. PTL depends more heavily on anchors, offsets, and phase structure. Recursively flattening both formats may produce something visible while placing every event at the wrong time. In particular, a technical PTL anchor does not always equal the phase boundary the user sees.</p>
			<p>The import layer was therefore split into two steps: identify the format, then normalize it into internal editor events. Each event contains at least a skill ID, name, time, phase, category, source, duration, and target. Missing fields receive defaults, and an unknown job or ACR does not prevent basic browsing.</p>
			<p>Export keeps two paths.</p>
			<ul>
				<li>Export a native PromeRotation timeline while preserving imported Meta, Root, or original PTL content wherever possible.</li>
				<li>Export a WebTimeline project that retains the complete editing state for later work.</li>
			</ul>
			<p>The central rule is that a round trip must not lose data. WebTimeline cannot merely ingest a file; it has to return an edited result safely to the original workflow.</p>

			<h2>Stage Three: Turn the Browser into a Real Editor</h2>
			<p>Once the timeline was visible, the next problem was preventing accidental edits.</p>
			<p>WebTimeline opens in browse mode. Skills cannot be dragged, and clicking one only shows details or locates it in the right-hand overview. In edit mode, manual skills and editable imported events unlock, while Boss skills and automatically simulated ACR skills remain locked.</p>
			<p>This distinction sounds small, but almost every interaction must obey it: drag listeners, delete buttons, time inputs, the skill insertion panel, and the target selector.</p>

			<h3>Floating Skill Insertion Panel</h3>
			<p>Skill insertion became a floating tool enabled only in edit mode. The panel can move so it does not cover the phase being edited. Its library shows only skills relevant to the current job and groups them into all, damage, mitigation, tincture, 60-second burst, 120-second burst, and QT.</p>
			<p>Direct skill-ID input remains available, but users no longer have to repeat the skill name. A valid ID automatically resolves to its database name and icon.</p>

			<h3>Dragging Is Not Just Changing a left Value</h3>
			<p>The drag interaction was rewritten several times.</p>
			<p>The first implementation used native browser drag and drop, which was unstable for long mitigation bars. Re-rendering the entire timeline during a drag also made horizontal scroll jump. I later added a Pointer Events path and moved high-frequency guide updates into <code>requestAnimationFrame</code>. The current track and time-conversion context are cached when dragging begins. During movement, only the guide line, time bubble, and differences from nearby events update; data is committed after release.</p>
			<p>Dragging a skill now shows several pieces of feedback at once.</p>
			<ul>
				<li>The exact proposed drop time.</li>
				<li>The difference in seconds from nearby skills.</li>
				<li>The allowed boundaries of the current phase.</li>
				<li>Whether the current track accepts this kind of skill.</li>
			</ul>
			<p>It feels closer to editing video than guessing a percentage position.</p>

			<h3>Cooldown Validation Must Match Game Logic</h3>
			<p>Dragging alone is not enough. If a user can insert a skill before its cooldown is ready, the resulting timeline is meaningless.</p>
			<p>WebTimeline checks the queue using skill ID, shared cooldown key, charges, and recast time. An invalid insertion reports a conflict or moves a manual skill to its next usable time. When validating an existing event, the system must exclude the skill currently being moved. A future use of the same skill must not incorrectly prevent the current one from moving earlier.</p>
			<p>The opener also participates in the cooldown baseline. Otherwise, a skill used during the countdown or pull is incorrectly considered ready at the start of P1. These issues do not crash the page, but they destroy trust in the entire timeline, so I added dedicated regression tests.</p>

			<h2>Stage Four: Mitigation Has a Target as Well as a Time</h2>
			<p>Damage skills can usually default to the Boss, but mitigation, healing, invulnerability, and support skills cannot.</p>
			<p>A self-targeted invulnerability, single-target mitigation for a teammate, and Reprisal targeting the Boss may all appear in the mitigation track but follow completely different target rules. WebTimeline therefore made the target a first-class event field.</p>
			<ul>
				<li>Attack skills target the Boss by default.</li>
				<li>Mitigation, healing, and invulnerability require target confirmation.</li>
				<li>Support mitigation cannot target the Boss.</li>
				<li>Imported mitigation can have its target edited in the details panel.</li>
			</ul>
			<p>After a target-dependent skill is dropped, a selector follows the newly placed event. To avoid being clipped by the timeline container, it became a fixed-position overlay, while horizontal scroll is retained across re-renders.</p>
			<p>It is a small interface, but it connects import, editing, categorization, and final export. Without it, the time may be correct while the execution target is still wrong.</p>

			<h2>Stage Five: Bring in ACR Data</h2>
			<p>WebTimeline is not another skill table independent of PromeRotation. It needs to understand the selected job and ACR.</p>
			<p>The data pipeline reads PromeRotation source code, player-uploaded ACR packages, and necessary parse artifacts, then generates an ACR database for the frontend. It records jobs, ACR names, authors, support status, skills, QT controls, and generation time.</p>
			<p>With that data, the editor can:</p>
			<ul>
				<li>Detect the job and ACR from an imported timeline.</li>
				<li>Provide a skill insertion list for the current job.</li>
				<li>Generate an ACR simulation when no handwritten damage timeline exists.</li>
				<li>Discover QT controls from an ACR instead of hard-coding one author's implementation.</li>
				<li>Distinguish simulated, imported, and manual events.</li>
			</ul>
			<p>QT controls were initially scattered across damage and burst tracks. They later moved into a dedicated track. QT states near the same time collapse into one icon; clicking it reveals the individual switches without filling a row with repeated controls.</p>
			<p>The 60- and 120-second bursts are no longer settings outside the page. They participate in the main timeline as burst packages. New users see start time, skill count, and source; detailed users can expand the internal skills.</p>

			<h2>Stage Six: Watching, Tracking, and the Full-Page Overview</h2>
			<p>Watching a skill and locating a skill were once mixed together.</p>
			<p>They are now two distinct operations.</p>
			<ul>
				<li>A watched skill belongs to a persistent list that summarizes every occurrence and source across the timeline.</li>
				<li>Tracking is a one-time location action. Clicking a skill on the right highlights it on the main timeline; clicking a timeline skill expands the corresponding event in the overview.</li>
			</ul>
			<p>The right panel now handles browsing and tracking only, not insertion. It became a full-page overview where Boss, opener, damage, mitigation, burst, and QT sections can collapse. While viewing one phase, tracking searches that phase first instead of unexpectedly jumping to the full-fight view.</p>
			<p>Track visibility controls were also added to the left side. Users can temporarily hide Boss, damage, mitigation, or burst bars and leave space for the content they are checking.</p>

			<h2>Stage Seven: Expand from One Ultimate to More Boss Baselines</h2>
			<p>The first stage of WebTimeline focused on the initial Ultimate encounter. As the editor stabilized, baseline Boss data expanded to more Ultimate raids. It now includes basic timelines for the original encounter, Unending Coil, The Epic of Alexander, Dragonsong's Reprise, and Futures Rewritten.</p>
			<p>Most of this data comes from FFLogs combat events, but collecting events does not automatically produce a correct baseline.</p>
			<p>The first version only matched Boss casts with corresponding damage packets, which missed two important event types.</p>
			<ol>
				<li>Boss abilities that deal damage without a matching cast.</li>
				<li>Actions or stationary markers with no damage value that still determine mechanic timing.</li>
			</ol>
			<p>The current builder merges three record types.</p>
			<ul>
				<li>Events produced by matching casts with release damage.</li>
				<li>Boss damage events with no matching cast.</li>
				<li>Zero-damage markers that still matter to the mechanic timeline.</li>
			</ul>
			<p>It also filters auto-attacks, aggregated DoTs, purely visual actions, friendly sources, and obvious noise. New ability names enter a local Chinese mapping so the timeline does not mix untranslated English names into the data.</p>
			<p>Boss portraits follow a conservative rule: show one only when the project has the correct asset. New encounters without portraits do not reuse an unrelated Boss image as a placeholder; they wait for the proper material.</p>

			<h2>Stage Eight: Move the UI from Feature-Complete to Sustainable</h2>
			<p>WebTimeline's interface has been rebuilt more than once.</p>
			<p>The early page was heavily divided. Left navigation, right tools, and top information each consumed space while the editor itself became narrow. Large explanatory cards were gradually removed. Import, export, job, ACR, mode, and encounter data moved into one light toolbar; the left side keeps lightweight track icons, and the right side keeps only the full-page overview.</p>
			<p>The current design uses a warm light background, thin borders, restrained corner radii, and subtle shadows, taking cues from tools such as Claude and Anthropic. It is not intended as a poster. It lets a user stare at hundreds of time points and still understand hierarchy.</p>
			<p>Several unremarkable-looking details required repeated adjustment.</p>
			<ul>
				<li>Boss cast, release, damage, and end information must not cover one another.</li>
				<li>Duration-based mitigation remains proportional to real time without stretching its text.</li>
				<li>Events at the end of P5 are clipped to track boundaries rather than protruding from the container.</li>
				<li>Player skills close in time receive visual staggering instead of collapsing into one card.</li>
				<li>The mini navigation bar remains visible instead of requiring a trip to the bottom of a long timeline.</li>
				<li>Narrow screens allow horizontal browsing without crushing buttons and text into unreadable widths.</li>
			</ul>
			<p>These changes are difficult to summarize as one major feature, but they determine whether the editor is a demo or a tool that can be used every day.</p>

			<h2>Testing and Deployment</h2>
			<p>Many timeline-editor bugs look approximately right while storing the wrong data. The project therefore accumulated regression tests around real behavior.</p>
			<ul>
				<li>Traditional trigger and PTL format detection.</li>
				<li>Phase anchors and relative-to-absolute time conversion.</li>
				<li>Data retention across import and export.</li>
				<li>Isolation between edit and browse modes.</li>
				<li>Pointer dragging, scroll retention, and placement guides.</li>
				<li>Cooldown conflicts and opener baselines.</li>
				<li>Mitigation categories, target restrictions, and target selection.</li>
				<li>ACR simulation, QT controls, and burst packages.</li>
				<li>Boss casts, damage, zero-damage mechanic markers, and localized names.</li>
				<li>Right-side tracking, reverse location, and watched-skill summaries.</li>
				<li>Timeline boundaries, card overlap prevention, and responsive layout.</li>
			</ul>
			<p>At the time of writing, all 286 tests pass, as does the static build. The site is statically deployed to Cloudflare Pages with separate home and editor entry points. Core data is generated at build time, so the browser does not need to store private API credentials.</p>

			<h2>The Most Important Lessons from This Work</h2>
			<h3>1. A Timeline Editor Is First a Data Converter</h3>
			<p>Dragging is only the surface. The difficult part is preserving meaning among PR, PTL, ACR, Boss events, and WebTimeline's internal model. If phase, target, or source is lost, a polished interface cannot recover it.</p>
			<h3>2. Source Should Not Be the Main Category</h3>
			<p>Manual, imported, and simulated are useful labels, but they should not become three unrelated timelines. The user is editing a battle plan, not a data pipeline.</p>
			<h3>3. Editing Freedom Must Respect Game Rules</h3>
			<p>The editor may let skills move freely, but it cannot allow impossible cooldowns, invalid targets, or cross-phase drift. A trustworthy constraint is more valuable than a canvas that permits everything.</p>
			<h3>4. Real Samples Are More Complex Than Imagined Formats</h3>
			<p>Dark Knight timelines, White Mage timelines, PTL, player ACR packages, and FFLogs Boss events repeatedly exposed edge cases. Every fix should leave a sample and a test, or the next UI change will bring old failures back.</p>
			<h3>5. Interface Space Is Itself a Feature</h3>
			<p>The longer the timeline, the more valuable the editor area becomes. Every sidebar, explanation box, and large heading takes space away from comparing skills. The final interface should quietly support the data rather than compete for attention.</p>

			<h2>Where It Is Now</h2>
			<p>WebTimeline now has a usable core loop.</p>
			{{code:0}}
			<p>It is still early. ACT and FFLogs comparison, damage estimates, broader job and ACR support, versioned local storage, shareable presentation pages, mobile support, and eight-player collaboration remain a long way off.</p>
			<p>The next stage will continue to prioritize data trustworthiness: complete more Ultimate skills and localized names, improve ACR simulation across jobs, keep validating PTL and traditional round trips, and make mitigation, QT, and burst editing better match what the plugin actually executes.</p>

			<h2>Closing Thoughts</h2>
			<p>WebTimeline began with a simple thought: if a timeline is just “do this at this time,” why can it not be arranged like a video edit?</p>
			<p>The further development goes, the more certain I am that visualization is not a pretty shell over a complex system. Its real job is to turn rules hidden in JSON, trigger conditions, and author experience into something a user can observe, understand, and change.</p>
			<p>The first version is far from finished, but the path from “import a timeline I cannot understand” to “drag it in the browser, validate it, and return it to the plugin” is now connected.</p>
			<p>The next step is to keep refining it into a tool people genuinely want to use for writing timelines.</p>
		`, [0]),
	},
	'raphael-crafting-solver-ruri': {
		ja: withCodeBlocks(`
			<blockquote><p>Ruri は現在も FFXIV 中国版 7.51、Dalamud CN API 15 向けに開発中のプラグインです。この記事で扱うのはソルバー設計、オフラインシミュレーション、自動検証です。実クライアントで検証を終えていない部分を、安定動作済みとは書きません。</p></blockquote>

			<p>今回の開発は、「すごいアルゴリズムを実装しよう」と考えたところから始まったわけではありません。</p>
			<p>始まりは、ひどく単純なエラーでした。</p>
			<p>Ruri に Recipe 37825 を製作させた時のことです。キャラクターは 664 CP、必要工数は 10040、最大品質は 21200。旧ソルバーは最初の一手でこう返しました。</p>
			{{code:0}}
			<p>このメッセージは、それだけで矛盾しています。楽観的な品質上限が目標をはるかに上回っているのに、同時に目標は到達不能だと断言しているからです。</p>
			<p>原因は、旧ロジックが最初に「工数の完了だけを保証する」保守的な終了経路を探していたことでした。その経路は品質を上げないので、最終品質は当然 0 です。ところがプログラムは「この終了経路に品質がない」を「どの経路でも品質を得られない」と解釈し、本当の品質探索を始める前に停止していました。</p>
			<p>この問題で、私は一見単純な問いを整理し直すことになりました。<strong>製作ソルバーは、そもそも何を解いているのか。</strong></p>
			<p>答えは固定のスキル列ではありません。限られた資源、複雑なルール、変化する状態の中で、工数を完成させ、同時に品質目標も満たす経路を探すことです。</p>
			<p>この方向から、私は <a href="https://github.com/KonaeAkira/raphael-rs">Raphael</a> を詳しく調べ始めました。最も興味を引かれたのは「マクロを計算できる」ことではなく、FFXIV の製作を明快な探索問題として捉えている点でした。</p>
			<p>この記事では Raphael のアルゴリズム構造を中心に、そこから得た考え方を Ruri へどう組み込んだかを説明します。先に境界を明確にしておくと、現在の Ruri は <strong>Raphael-inspired な有界グローバル探索</strong>です。<code>raphael-rs</code> の逐語的な移植ではなく、Raphael と同じ厳密な大域最適性もまだ主張できません。</p>

			<h2>まず製作を一つの状態として書く</h2>
			<p>プレイヤーに見えるのは耐久、CP、工数、品質です。ソルバーが扱う状態は、もう少し複雑です。</p>
			{{code:1}}
			<p>スキルを一つ使うたびに、状態は一つの辺を通って次へ移ります。</p>
			{{code:2}}
			<p>スキルと現在の状態が決定的なら、<code>outcome</code> も決定的で、これは通常の状態遷移です。成功率を持つアクションや次の状態を確率で展開する場合は、遷移が複数の枝に分かれます。</p>
			<p>したがって、製作全体は有向グラフとして見ることができます。</p>
			{{code:3}}
			<p>目標も単一のスコアではなく、優先順位を持つ制約です。</p>
			<ol>
				<li>まず製作を完了する。工数が満たされない案は候補になりません。</li>
				<li>HQ または収集品の品質しきい値を満たす。</li>
				<li>その二つを満たした後で、品質、手数、時間、残り資源を比較する。</li>
			</ol>
			<p>この順序は重要です。少し品質が高い代わりに最後まで完成できない経路は選べません。また、「目標に近そう」というだけで成功扱いにもできません。</p>

			<h2>四手の小さな例を手で解く</h2>
			<p>ゲーム内の数十個のアクションはいったん忘れ、三つの仮想アクションだけを考えます。目標は工数 100、品質 80。初期資源は耐久 30、CP 36 です。</p>
			<table><thead><tr><th>アクション</th><th>消費</th><th>効果</th></tr></thead><tbody>
				<tr><td>Innovation</td><td>18 CP</td><td>次の Touch の品質を 2 倍にする</td></tr>
				<tr><td>Touch</td><td>18 CP、耐久 10</td><td>品質を 40 増やす</td></tr>
				<tr><td>Synthesis</td><td>耐久 10</td><td>工数を 50 増やす</td></tr>
			</tbody></table>
			<p>目先の利益だけを見ると Touch を二回使いたくなります。状態は <code>p=0, q=0, d=30, cp=36</code> から <code>p=0, q=80, d=10, cp=0</code> になります。品質は達成しましたが、残り耐久では Synthesis を一回しか使えず、工数は最大 50 で失敗します。</p>
			<p>実行可能な経路は <code>Innovation → Touch → Synthesis → Synthesis</code> です。Innovation は耐久を使わず、強化された Touch 一回で品質 80 を得ます。残り耐久 20 で Synthesis を二回使い、最終状態は <code>p=100, q=80, d=0, cp=0</code> になります。</p>
			<p>この小さな例だけでも、三つの難しさが見えます。</p>
			<ol>
				<li>局所的に最も利益の高いアクションが、大域的に実行可能な経路へ属するとは限らない。</li>
				<li>品質と工数は同じ耐久と CP を奪い合うため、独立した二問題として解けない。</li>
				<li>実行可能な経路を見つけた後も、より短い経路や品質の高い経路がないか判断する必要がある。</li>
			</ol>
			<p>総当たりなら四手の組み合わせを全部試せます。しかし実際のレシピには二十以上の候補、数十手の深さ、多数の Buff 状態があります。Raphael の目的は、最適経路を落とさずに、望みのない組み合わせを深い探索へ入れないことです。</p>

			<h2>なぜすべての可能性を総当たりできないのか</h2>
			<p>各ステップで平均 20 個のアクションが選べ、計画の深さが 40 だとします。素朴な探索空間の上限はこうなります。</p>
			{{code:4}}
			<p>実際に計算する意味のない大きさです。レベル、CP、耐久、前提条件で多くのスキルが使えなくなっても、状態数は急速に増えます。</p>
			<p>さらに、異なる順序が「効果の文脈は同じだが資源量だけが違う」状態へ到達する場合があります。Buff、状態、コンボ条件が同じで、一方が工数、品質、耐久、CP のすべてで優れているなら、弱い方を探索し続けても同じ仕事を繰り返すだけです。</p>
			<p>つまりソルバーの核心は探索そのものではなく、<strong>どの枝を早い段階で捨ててもよいと証明するか</strong>にあります。</p>
			<p>Raphael は best-first search、branch-and-bound、動的計画法、Pareto 最適化を組み合わせ、専用のサブソルバーから主探索へ上限と下限を供給します。</p>

			<h2>Raphael の主構造：DAG 上の最短路として考える</h2>
			<p>Raphael は製作状態をノード、合法なアクションを辺として扱います。主探索は生成順に深く潜るのではなく、最も有望なノードから展開します。</p>
			<p><code>A(s)</code> を状態 <code>s</code> で使えるアクション集合、<code>T(s,a)</code> をアクション後の状態、<code>P*</code> と <code>Q*</code> を目標工数と目標品質とします。探索中に見つかった最良の完全解は incumbent として保存します。</p>
			<p>各未展開状態に対し、サブソルバーは最大工数、最大品質、最低残り手数という楽観評価を返します。楽観評価は未来を現実より良く見ることはあっても、悪く見てはいけません。その楽観評価でさえ incumbent に勝てないなら、実際の経路も勝てないため、安全に枝を捨てられます。</p>
			<p>理解のために簡略化した擬似コードは次のようになります。</p>
			{{code:5}}
			<p><code>queue.popBest()</code> が best-first です。最も期待できる状態から調べます。解が見つかった後、incumbent で後続探索を制限するのが branch-and-bound です。upper bound は枝が到達できる「最高の幻想」、incumbent は実際に得た「現在の最高記録」です。幻想でさえ記録に勝てなければ、それ以上調べる必要はありません。</p>
			<p>ここでは二つの結論を分ける必要があります。</p>
			<ul>
				<li><strong>実行可能解を見つけた</strong>：工数と品質を満たす経路が一つある。</li>
				<li><strong>最適解を証明した</strong>：未展開の全経路について、楽観上限でも現在解を超えられない。</li>
			</ul>
			<p>最初の解が見つかっただけでは最適ではありません。時間またはノード予算が先に尽きた場合は bounded result であり、exact optimal とは呼べません。</p>
			<p>このアルゴリズムの美しさは主ループではなく、周囲の「証明器」にあります。</p>

			<h2>FinishSolver：まず最後まで作れるかを問う</h2>
			<p>品質がどれほど高くても、残り耐久と CP で工数を満たせない状態は行き止まりです。</p>
			<p><code>FinishSolver</code> は品質を一度脇に置き、現在の状態から理論上どこまで工数を伸ばせるかだけを考えます。</p>
			<p>memo 付きの再帰としては、<code>F(s) = max(Δprogress(s,a) + F(T(s,a)))</code> と表せます。<code>a</code> は終了に使えるアクションだけです。同じ CP、耐久、工数状態が再び現れたら、計算済みの <code>F(s)</code> を再利用します。</p>
			<p><code>state.progress + F(state) &lt; P*</code> なら、未来を最も有利に並べても工数が不足するため、初めて「完成不能」を証明できます。小さな例で Touch を二回使った後は耐久 10 なので、<code>F(s)</code> は最大 50。<code>0 + 50 &lt; 100</code> となり、その枝は直ちに削除されます。</p>
			<p>安全な枝刈りのため、この見積もりは楽観的でなければなりません。将来は常に効率の良い進捗アクションを使える、資源交換が実際より少し有利だ、と仮定しても構いません。しかし現実の上限を過小評価してはいけません。</p>
			<ul>
				<li>上限が高すぎる場合、枝刈りが減って性能が落ちます。</li>
				<li>上限が低すぎる場合、本来可能な経路を削除し、正しさを壊します。</li>
			</ul>
			<p>Ruri の <code>ProgressFeasibilitySolver</code> もこの原則に従います。耐久回復と Waste Not の効果を意図的に大きく見積もり、CP から得られる行動回数も緩めに計算します。その広い見積もりでも工数を完成できない時だけ、物理的に不可能と判断できます。</p>
			<p>Recipe 37825 の修正で最初に分けたのもこの境界でした。<strong>工数用の終了経路は工数だけを証明するものであり、progress-only 経路の品質が 0 だからといって HQ 目標全体を否定してはいけません。</strong></p>

			<h2>QualityUbSolver：品質は最大でどこまで伸びるか</h2>
			<p>工数を完成できても、HQ や収集品の品質目標に届くとは限りません。そこで残り資源から得られる品質の上限を見積もります。</p>
			<p>Raphael の <code>QualityUbSolver</code> は、耐久、Manipulation、専門アクションなどを計算しやすい共通予算へ緩和し、動的計画法で工数と品質の Pareto frontier を維持します。</p>
			<p>残り資源を全部品質へ使った最大値だけでは、工数用の資源を忘れてしまいます。必要なのは、例えば <code>(追加工数 100, 追加品質 80)</code> と <code>(追加工数 150, 追加品質 50)</code> のような、互いに支配されない組み合わせの集合です。前者は品質、後者は工数で優れるため、両方に価値があります。</p>
			<p>各アクションの <code>(Δprogress, Δquality)</code> を次状態の Pareto 集合へ加え、他の点に両方で負ける結果を消すことで、「残り資源と交換できる工数・品質の境界」を得ます。</p>
			<p>小さな例で最初の Touch 後にもう一度 Touch すれば品質 80 ですが、残り工数は 50 までです。耐久を二回の Synthesis に使えば工数 100 ですが、品質は 40 のままです。個別の最大値は 100 と 80 でも、同時には取得できません。結合 Pareto 境界なら、その枝が目標 <code>(100,80)</code> に届かないと分かります。</p>
			<p>Ruri の現在の実装はもっと単純で、より保守的です。<code>QualityUpperBoundSolver</code> は、残りの品質アクションがすべて非常に理想的な状況で使えると仮定します。</p>
			<ul>
				<li>Excellent が最高の品質倍率を与える。</li>
				<li>Innovation と Great Strides の恩恵を同時に受ける。</li>
				<li>Inner Quiet は最大スタックとして扱う。</li>
				<li>残り耐久と CP はできるだけ多くの品質アクションへ交換できる。</li>
			</ul>
			<p>これは現実の計画ではなく、意図的に膨らませた天井です。そんな理想的な世界でも目標へ届かない時にだけ、その枝を安全に削除できます。</p>
			{{code:6}}
			<p>二つ目は「まだ不可能だと証明できない」という意味であり、実行可能性の証明ではありません。旧ソルバーはこの二つを取り違えていました。</p>

			<h2>StepLbSolver：最低でもあと何手必要か</h2>
			<p>CP が十分にあると、工数と品質の上限は広くなり、枝刈りの力が弱まります。そこで Raphael は、どれほど理想的に進んでも工数と品質を同時に満たすまで最低何手必要か、という下界も計算します。</p>
			<p>目標達成時を <code>L(s)=0</code>、それ以外を <code>L(s)=1+min L(T(s,a))</code> とする最短路型の再帰です。安全な下界にするため、CP 制約を一部無視するなど未来を有利に緩和できますが、最低手数を現実より大きく見積もってはいけません。</p>
			<p>現在の経路が 25 手、少なくとも残り 8 手必要で、すでに 30 手の解が見つかっているなら、その経路は手数で勝てません。</p>
			<p>ただし、手数比較は上位目標が同じ時だけ有効です。短い未達成案で、長い最大品質案を支配することはできません。</p>
			<p>Ruri には現在、レシピ内で最大の進捗 potency から終了手数を見積もる簡易 <code>FinishStepLowerBound</code> があります。しかし Raphael の完全な <code>StepLbSolver</code> DP はまだ実装していません。そのため、今は厳密な最適性証明よりキュー順序の補助に使っています。</p>

			<h2>Pareto 枝刈り：本当に違う状態だけを残す</h2>
			<p>同じ状態、前のアクション、Buff の残り時間、有限資源を持つ A と B があり、A が次の条件を満たすとします。</p>
			{{code:7}}
			<p>少なくとも一項で厳密に優れていれば、A は B を支配します。B からできることは通常 A からもでき、しかも資源は悪化していないため、B を探索し続ける必要はありません。</p>
			<p>実装では四つの数値だけを比べてはいけません。Buff の残り時間、球色、前のアクションが違えば、後続アクションの合法性と価値が変わります。</p>
			<p>そこで Ruri は <code>FrontierKey</code> に Condition、PreviousAction、各 Buff の残り回数、Inner Quiet、Heart and Soul、Trained Perfection などを含めます。key が同じ状態だけを工数、品質、耐久、CP で比較し、弱い状態を捨てます。</p>
			<p>これは通常の重複除去を強化したものです。完全に同じ状態だけでなく、重要な全次元で劣る状態も削除できます。</p>
			<p>Raphael は大規模な状態集合に対してバケットと近似 Pareto frontier を使い、支配判定の費用を抑えます。Ruri はまだ等価コンテキストごとのリスト比較で、規模も実装もより素朴です。</p>

			<h2>Ruri で各部品をどう接続したか</h2>
			<p>現在、Ruri の品質目標は <code>GlobalCraftSearchSolver</code> へ送られます。構造はおおよそ次の通りです。</p>
			{{code:8}}
			<p><code>CraftSimulator</code> はシステム全体の真値です。アクションの合法性、CP と耐久の消費、工数と品質の増加、Buff の更新は、すべて同じシミュレーターを通ります。探索用と実行用で別のルールを持てば、両者はいつか必ずずれます。</p>
			<p>探索開始時、Ruri は三つの準備を行います。</p>
			<ol>
				<li>状態フィールドとルールセットが完全か検証する。</li>
				<li>工数の楽観上限で、本当の物理的行き止まりを拒否する。</li>
				<li>ヒューリスティックプランナーから完成可能な incumbent を作り、最初の候補とする。</li>
			</ol>
			<p>ノードはその後 PriorityQueue に入ります。優先度は現在の品質と工数、両方の楽観上限、終了までの下界、残り CP と耐久を見ます。品質だけで並べると、前半で資源をすべて品質に使い、最後に工数を完成できないという元の問題を繰り返します。</p>
			<p>現在は、Inner Quiet と品質 Buff を立ち上げる段階には余地を与え、品質が成熟したら工数側のボトルネックを優先するバランス型の順序を使っています。これは Raphael の元の評価関数ではなく、Ruri のリアルタイム再計画向けの工程上の選択です。</p>
			<table><thead><tr><th>役割</th><th>Raphael の完全な考え方</th><th>Ruri の現在</th></tr></thead><tbody>
				<tr><td>主探索</td><td>Best-first + branch-and-bound で最適性証明まで探索</td><td>時間・深さ・ノード予算付き PriorityQueue</td></tr>
				<tr><td>FinishSolver</td><td>圧縮状態 DP による可行性と下界</td><td>楽観工数式 + 有界終了 beam</td></tr>
				<tr><td>QualityUbSolver</td><td>資源緩和後の工数・品質 Pareto DP</td><td>意図的に緩い品質公式上限</td></tr>
				<tr><td>StepLbSolver</td><td>DP で安全な手数下界</td><td>最大進捗 potency による簡易推定</td></tr>
				<tr><td>Pareto</td><td>大規模向けバケット化近似前沿</td><td>等価コンテキスト内のリスト比較</td></tr>
				<tr><td>確率性</td><td>adversarial 最悪条件モード</td><td>別 expectimax 経路、live は決定的</td></tr>
			</tbody></table>
			<p>したがって現在の Ruri が証明するのは、「目標を満たす計画を見つけ、再生検証した」ことです。「すべての合法案の中で最短」とは証明していません。最大品質の終端が見つかると、live 経路は実行可能な最初の一手を返すことを優先し、最短マクロの証明までキューを尽くしません。これがリアルタイム実行とオフライン最適化の中心的な取捨選択です。</p>

			<h2>なぜ「意味のあるアクション列」を追加したのか</h2>
			<p>一手ずつ展開する方法は明快ですが、live の一秒予算では明らかな中間状態に時間を使い切ることがあります。</p>
			<p>そこで Ruri は単独アクションに加え、いくつかの意味のある短い列も候補にします。</p>
			{{code:9}}
			<p>これらはシミュレーターを迂回するマクロではありません。列の各アクションは一つずつ合法性と状態遷移を検証され、一つでも不正なら列全体をキューへ入れません。</p>
			<p>検索器へ「よく使う言い回し」を渡し、一文字ずつ文章を組み立て直す回数を減らすようなものです。</p>
			<p>当然、アクション列、優先度、予算は探索へヒューリスティックな偏りを入れます。実用的な解を早く得る一方で、現在の実装を strict exact solver と呼べない理由にもなります。</p>

			<h2>固定マクロでは足りない：実機ではローリング再計画する</h2>
			<p>オフラインで完全な計画を得ても、ゲーム内で最初から最後まで機械的に実行すべきとは限りません。</p>
			<p>実際の製作では状態が変わり、アクションが拒否されることもあり、observer が一時的に完全な状態を読めない場合もあります。Ruri の live 実行は receding horizon、つまりローリングホライズンを使います。</p>
			{{code:10}}
			<p>これにより、ソルバーは未来の状態を予知したふりをせず、数十手後までにシミュレーションとゲームの差が蓄積することも避けられます。</p>
			<p>最初の一手だけを実行しても、完全な計画は無駄ではありません。その計画は現在の一手の後に少なくとも一つの継続経路があることを示し、再観測が次の判断を現実の状態へ戻します。</p>
			<p>送信後に状態変化が観測できなければ、Ruri は同じアクションを無条件に再送しません。不明な状態、タイムアウト、セッション変更、資源異常はすべて fail closed です。自動化プラグインでは、無理に継続するより勝手に押さないことの方が大切です。</p>

			<h2>確率アクションをどこに置くか</h2>
			<p>Raphael には adversarial モードがあります。最悪の状態で品質損失を評価し、より大きな計算量と引き換えに状態順序へ強いマクロを探します。これは平均利益を最大化する目標とは異なります。</p>
			{{code:11}}
			<p>Ruri の <code>GlobalCraftSearchSolver</code> は現在、決定的で live-safe な経路を担当します。成功率を持つアクションと確率分析は <code>StochasticExpectimaxSolver</code> に分け、decision node と chance node を交互に展開します。</p>
			<p>保守的 live モードでは、グローバル探索に確率アクションを使わせません。期待値の高い一度の失敗で、確保していた工数終了資源を失う可能性があるためです。将来 adversarial backend を実装するなら expectimax と併存させ、「最悪でも成立」と「平均で高収益」を明確に選べる形にすべきです。</p>

			<h2>Recipe 37825 の修正で本当に変えたこと</h2>
			<p>最初のエラーログへ戻ります。この最適化は検索器の交換だけでなく、結果の意味そのものを整理する作業になりました。</p>

			<h3>物理状態、注文目標、探索状態を分ける</h3>
			<p>シミュレーターは工数完了や耐久切れという物理結果だけを答えます。注文層が HQ または収集品品質を判定し、ソルバーは別の状態を返します。</p>
			<ul>
				<li><code>Solved</code>：完全な計画を見つけ、独立したシミュレーター再生を通過した。</li>
				<li><code>Partial</code>：候補はあるが、目標全体を証明していない。</li>
				<li><code>TimedOut</code>：時間またはノード予算を使い切った。</li>
				<li><code>Infeasible</code>：到達不能を示す硬い証拠がある。</li>
				<li><code>Unsupported</code>：ルールモデルが不完全なので推測を拒否した。</li>
			</ul>
			<p>以前の最も危険な点は、「この有界探索では見つからなかった」を <code>Infeasible</code> と呼んでいたことです。証明がなければ、正直に timeout または partial と書くべきです。</p>

			<h3>Solved はもう一度シミュレーションする</h3>
			<p>探索器が <code>Solved</code> を返すと、<code>SolverRouter</code> は新しいシミュレーターを作り、元の状態から全計画を再生します。</p>
			<ol>
				<li>各アクションが合法であること。</li>
				<li>耐久切れではなく、物理的に成功して終了すること。</li>
				<li>正規化された注文目標の品質を満たすこと。</li>
			</ol>
			<p>一つでも失敗すれば結果を降格し、誤った計画はキャッシュへ入りません。「答えを探す側」と「答えを検査する側」を分離した形です。</p>

			<h3>キャッシュもアルゴリズムの正しさに含まれる</h3>
			<p>キャッシュキーにはレシピデータ、完全な製作状態、目標、リスク設定、時間とノード予算、ルール指紋、アルゴリズムバージョンが入ります。</p>
			<p><code>CanHq</code>、Buff、前のアクション、ルールバージョンのどれかを落とすと、似ているだけの二つの要求が同じ計画を再利用する可能性があります。誤ったキャッシュヒットは、bug をより高速で安定して再現するだけです。</p>

			<h2>現在の結果と、誇張しない部分</h2>
			<p>Recipe 37825 の回帰シナリオでは、実機ログから得た製作力 5865、加工精度 5462、CP 664、初期品質 9904、工数目標 10040、品質目標 21200 を使っています。</p>
			<p>現在のグローバル探索は dry-run 予算内で再生可能な最大品質の完成計画を見つけます。模擬 live 実行も各観測後に再計算し、工数と品質の両方を満たします。PreviousAction が取得できない場合、早すぎる Immaculate Mend、耐久 5、すでに物理的な行き止まりに入った状態も回帰テストへ含めました。</p>
			<p>ただし、次の注記は残ります。</p>
			<ul>
				<li>確実な終了経路探索は幅 16、最大 8192 展開の有界 beam で、Raphael の完全な DP ではありません。</li>
				<li>品質上界は緩い公式上界で、CP 共通予算と完全な Pareto DP は未実装です。</li>
				<li>手数下界は簡易推定です。</li>
				<li>主探索には live 一秒、深さ、ノード数の予算があります。</li>
				<li>バランス評価と意味的アクション列を使うため、bounded / heuristic であり厳密な最適性証明はありません。</li>
				<li>確率状態に対する adversarial 探索はまだありません。</li>
				<li>自動テストはシミュレーション契約を証明するもので、すべてのレシピを中国版実クライアントで検証したことにはなりません。</li>
			</ul>
			<p>私はこれらの境界を少し格好悪くても明記したいと思います。アルゴリズムが信頼できるかどうかは、まず自分が何を証明できるのかを正直に述べているかで決まるからです。</p>

			<h2>次にどう最適化するか</h2>
			<p>Raphael にさらに近づけるなら、順序は次のようになります。</p>
			<p>第一に、FinishSolver を独立した動的計画問題にします。現在の beam は終了経路を速く見つけられますが、「見つからない」が常に「存在しない」を意味するわけではありません。より強い memo と状態圧縮で、この不確実性を減らせます。</p>
			<p>第二に、より厳密な品質上界を実装します。耐久、Manipulation、有限資源を共通予算へ変換し、<code>(progress, quality)</code> Pareto frontier を維持します。上界が引き締まるほど、主探索は現実には成立しない高品質経路へ時間を使わずに済みます。</p>
			<p>第三に、完全な StepLbSolver を追加します。特に資源が豊富な後半で、ある経路が手数で incumbent を超えられないことを証明できます。</p>
			<p>第四に、リスト式 Pareto frontier をバケット構造へ変え、状態遷移、上限・下限、支配判定のどこに時間がかかっているか計測します。</p>
			<p>第五に、adversarial モードと Monte Carlo 再生を加えます。前者は最悪状態で成功するか、後者は確率モデル上で HQ や収集品段階へ届く確率を答えます。</p>
			<p>並列化は最後です。十分な枝刈りがないままスレッドを増やしても、不要な状態を速く作るだけです。</p>

			<h2>最後に</h2>
			<p>Raphael を調べて、製作ソルバーに対する私の見方は大きく変わりました。これは手順を暗記する仕組みではありません。</p>
			<p>本当に扱っているのは、一連の証明です。</p>
			<ul>
				<li>FinishSolver は、この経路にまだ完成能力があることを示す。</li>
				<li>QualityUbSolver は、目標品質を追う資格が残っているかを示す。</li>
				<li>StepLbSolver は、現在の答えより短くなり得るかを示す。</li>
				<li>Pareto frontier は、どの状態が単に劣った重複かを示す。</li>
				<li>独立再生は、探索器の答えが本当にルールを満たすかを示す。</li>
			</ul>
			<p>Ruri はまだこの道の一部しか進んでおらず、live 一秒予算のために多くの現実的な妥協もしています。それでも Recipe 37825 の誤判定から、一つの原則をコードへ刻むことができました。</p>
			<blockquote><p>答えを見つけられなかったことは、答えが存在しないことを意味しない。証明を示せる時だけ、実行不可能だと言える。</p></blockquote>
			<p>この原則は、どんな一つの製作マクロより重要です。</p>

			<h2>参考資料</h2>
			<ul>
				<li><a href="https://github.com/KonaeAkira/raphael-rs">KonaeAkira/raphael-rs</a></li>
				<li><a href="https://github.com/KonaeAkira/raphael-rs/wiki/Algorithm-Overview">Raphael Algorithm Overview</a></li>
				<li><a href="https://github.com/Tnze/ffxiv-best-craft">Tnze/ffxiv-best-craft</a></li>
				<li><a href="https://github.com/PunishXIV/Artisan">PunishXIV/Artisan</a></li>
			</ul>
		`, Array.from({ length: 12 }, (_, index) => index)),
		en: withCodeBlocks(`
			<blockquote><p>Ruri is still a development-stage plugin for FFXIV China 7.51 and Dalamud CN API 15. This article covers solver design, offline simulation, and automated verification. I will not describe anything that still lacks real-client validation as stable.</p></blockquote>

			<p>This work did not begin with a plan to implement an impressive algorithm.</p>
			<p>It began with a rather foolish error.</p>
			<p>I was asking Ruri to craft Recipe 37825. The character had 664 CP, the progress target was 10040, and maximum quality was 21200. The old solver stopped on the very first step with this result:</p>
			{{code:0}}
			<p>The message gives itself away. It says the optimistic quality ceiling is far above the target, then declares the target unreachable in the same breath.</p>
			<p>The old logic first searched for a conservative finish path that guaranteed progress only. Naturally, that path did not perform quality actions, so its final quality was zero. The program then confused “this finish path gains no quality” with “no possible path can gain enough quality” and returned before the real quality search even began.</p>
			<p>That bug forced me to revisit a deceptively simple question: <strong>what is a crafting solver actually solving?</strong></p>
			<p>The answer is not a fixed list of actions. It is a path through a state space with limited resources, complicated rules, and changing conditions, where progress must finish and the requested quality target must also be met.</p>
			<p>That led me to study <a href="https://github.com/KonaeAkira/raphael-rs">Raphael</a> in earnest. The most interesting part was not that it could generate a macro. It was the clarity with which it turned FFXIV crafting into a search problem.</p>
			<p>This article focuses on Raphael's algorithmic structure and then explains how I brought some of those ideas into Ruri. The boundary matters: Ruri currently implements a <strong>Raphael-inspired bounded global search</strong>. It is not a line-by-line port of <code>raphael-rs</code>, and it does not yet have Raphael's strict global-optimality guarantees.</p>

			<h2>Start by Writing Crafting as State</h2>
			<p>A player sees durability, CP, progress, and quality. A solver has to see considerably more.</p>
			{{code:1}}
			<p>Every action moves the craft along an edge into a new state:</p>
			{{code:2}}
			<p>If the action and current condition are deterministic, the outcome is deterministic as well. An action with a success rate, or a next condition expanded by probability, produces several transition branches.</p>
			<p>The complete craft can therefore be viewed as a directed graph:</p>
			{{code:3}}
			<p>The objective is not one score either. It is a set of lexicographically ordered constraints:</p>
			<ol>
				<li>The craft must finish. A plan with incomplete progress is not useful.</li>
				<li>The plan must meet the HQ or collectable quality threshold.</li>
				<li>Only after those constraints are satisfied do quality, steps, duration, and remaining resources become tie-breakers.</li>
			</ol>
			<p>This ordering matters. A little more quality cannot justify a path that eventually fails to finish, and a state that merely looks close to the goal is not a success.</p>

			<h2>Work Through a Four-Step Example by Hand</h2>
			<p>Forget the dozens of real game actions for a moment and keep only three fictional ones. The goal is 100 progress and 80 quality, starting with 30 durability and 36 CP.</p>
			<table><thead><tr><th>Action</th><th>Cost</th><th>Effect</th></tr></thead><tbody>
				<tr><td>Innovation</td><td>18 CP</td><td>Double the quality of the next Touch</td></tr>
				<tr><td>Touch</td><td>18 CP, 10 durability</td><td>Add 40 quality</td></tr>
				<tr><td>Synthesis</td><td>10 durability</td><td>Add 50 progress</td></tr>
			</tbody></table>
			<p>Two Touch actions look attractive if we only consider immediate gain. The state moves from <code>p=0, q=0, d=30, cp=36</code> to <code>p=0, q=80, d=10, cp=0</code>. Quality is complete, but there is durability for only one Synthesis, so progress can reach at most 50 and the craft must fail.</p>
			<p>The feasible path is <code>Innovation → Touch → Synthesis → Synthesis</code>. Innovation consumes no durability, the empowered Touch reaches 80 quality in one action, and the remaining 20 durability pays for two Synthesis actions. The terminal state is <code>p=100, q=80, d=0, cp=0</code>.</p>
			<p>This tiny example already contains three hard parts of the real problem:</p>
			<ol>
				<li>The action with the best local payoff may not belong to any globally feasible path.</li>
				<li>Quality and progress compete for the same durability and CP, so they cannot be solved as independent problems.</li>
				<li>After finding one feasible path, the solver must still decide whether a shorter or higher-quality path exists.</li>
			</ol>
			<p>Brute force can try every four-step combination here. A real recipe has more than twenty candidates, dozens of steps, and many buff states. Raphael's job is to keep hopeless combinations out of deep search without discarding the optimal path.</p>

			<h2>Why Brute Force Is Not an Option</h2>
			<p>Suppose an average step offers 20 actions and a plan reaches a depth of 40. A naive upper bound on the search space is:</p>
			{{code:4}}
			<p>The number is useless in practice. Level, CP, durability, and prerequisites remove many actions, but the remaining state space still expands extremely quickly.</p>
			<p>Different action orders can also reach states with the same effect context but different resources. If two states have identical buffs, condition, and combo context, while one has no less progress, quality, durability, or CP, continuing from the weaker state usually repeats work.</p>
			<p>The heart of a crafting solver is therefore not merely searching. It is <strong>proving as early as possible that a branch no longer deserves to be searched</strong>.</p>
			<p>Raphael does this by combining best-first search, branch-and-bound, dynamic programming, and Pareto optimization. Several specialized sub-solvers continuously provide upper and lower bounds to the main search.</p>

			<h2>Raphael's Main Framework: A Shortest Path over a DAG</h2>
			<p>Raphael treats crafting states as nodes and legal actions as edges. Its main search expands the most promising node first instead of blindly following generation order.</p>
			<p>Let <code>A(s)</code> be the legal actions in state <code>s</code>, <code>T(s,a)</code> the state after action <code>a</code>, and <code>P*</code> and <code>Q*</code> the progress and quality targets. The best complete plan found so far is stored as the incumbent.</p>
			<p>For every unexpanded state, the sub-solvers provide an optimistic assessment: maximum reachable progress, maximum reachable quality, and minimum remaining steps. Optimistic means they may imagine a future better than reality, never worse. If even that optimistic future cannot beat the incumbent, the real continuation cannot beat it either and the branch is safe to remove.</p>
			<p>A deliberately simplified version looks like this:</p>
			{{code:5}}
			<p><code>queue.popBest()</code> is best-first: inspect the theoretically strongest state first. Once a solution exists, restricting later work with the incumbent is branch-and-bound. An upper bound is the best fantasy a branch could achieve; the incumbent is the best result actually in hand. If the fantasy cannot beat the record, there is nothing left to search.</p>
			<p>Two conclusions must remain separate:</p>
			<ul>
				<li><strong>A feasible solution was found</strong>: at least one path satisfies progress and quality.</li>
				<li><strong>The optimal solution was proved</strong>: every unexpanded path has an optimistic bound no better than the incumbent.</li>
			</ul>
			<p>The first solution is not automatically optimal. If the time or node budget expires before the second statement is proved, the result is bounded, not exact optimal.</p>
			<p>The elegant part is not the loop itself. It is the set of small proof engines around it.</p>

			<h2>FinishSolver: Can This State Still Finish?</h2>
			<p>No amount of quality matters if the remaining durability and CP can no longer fill the progress bar.</p>
			<p><code>FinishSolver</code> temporarily removes quality from the question and asks how much progress can theoretically still be produced from the current state.</p>
			<p>As a memoized recurrence, it can be written as <code>F(s) = max(Δprogress(s,a) + F(T(s,a)))</code>, where <code>a</code> ranges only over actions allowed in a finish. When the same remaining CP, durability, and progress context appears again, the cached <code>F(s)</code> is reused.</p>
			<p>If <code>state.progress + F(state) &lt; P*</code>, progress is insufficient even under the most favorable continuation. That is a proof of physical infeasibility. In the toy example, the second Touch leaves 10 durability, so <code>F(s)</code> is at most 50. Because <code>0 + 50 &lt; 100</code>, the greedy quality branch can be pruned immediately.</p>
			<p>For pruning to be safe, that estimate must be optimistic. It may assume that future progress actions are unusually efficient or that resources convert more generously than they do in a real rotation. What it must never do is underestimate the true maximum.</p>
			<ul>
				<li>An upper bound that is too high prunes fewer states and costs performance.</li>
				<li>An upper bound that is too low deletes a viable path and breaks correctness.</li>
			</ul>
			<p>Ruri's <code>ProgressFeasibilitySolver</code> follows the same rule. It deliberately overestimates durability recovery and Waste Not, and relaxes how many actions CP can buy. Only if the craft still cannot finish under that generous model may it be called physically impossible.</p>
			<p>This was the first boundary repaired for Recipe 37825: <strong>a progress finish solver proves progress facts. The zero quality of a progress-only suffix cannot disprove the entire HQ objective.</strong></p>

			<h2>QualityUbSolver: How High Could Quality Possibly Go?</h2>
			<p>Being able to finish progress does not mean an HQ or collectable target remains reachable. The solver also needs an upper bound on quality available from the remaining resources.</p>
			<p>Raphael's <code>QualityUbSolver</code> relaxes durability, Manipulation, specialist resources, and related effects into a shared budget that is easier to optimize, then uses dynamic programming to maintain a Pareto frontier of progress and quality.</p>
			<p>Simply asking for the maximum quality after spending every remaining resource on Touch actions forgets that progress still needs a reserve. A useful result is a set of non-dominated pairs such as <code>(+100 progress, +80 quality)</code> and <code>(+150 progress, +50 quality)</code>. The first has more quality, the second more progress, so both remain relevant.</p>
			<p>For each legal action, its <code>(Δprogress, Δquality)</code> is added to the next state's Pareto set, then every result beaten on both dimensions is removed. The result is not one rotation but a boundary of progress-quality exchanges available from the remaining resources.</p>
			<p>In the toy example, a second Touch reaches 80 quality but leaves resources for only 50 progress. Saving both durability slots for Synthesis reaches 100 progress but leaves quality at 40. The separate maxima are 100 and 80, but they cannot be obtained together. The joint Pareto boundary exposes that the branch cannot reach <code>(100,80)</code>.</p>
			<p>Ruri's current implementation is simpler and looser. <code>QualityUpperBoundSolver</code> assumes that future quality actions happen under an unrealistically favorable setup:</p>
			<ul>
				<li>Excellent supplies the highest condition multiplier.</li>
				<li>Innovation and Great Strides contribute together.</li>
				<li>Inner Quiet is evaluated at its maximum stack count.</li>
				<li>Remaining durability and CP buy as many quality actions as possible.</li>
			</ul>
			<p>This is not a real rotation. It is an intentionally inflated ceiling. A branch can be pruned only when it misses the target even in this idealized world.</p>
			{{code:6}}
			<p>The second result does not prove feasibility. It only says that infeasibility has not been proved yet. The old solver confused those two conclusions.</p>

			<h2>StepLbSolver: How Many Steps Are Still Unavoidable?</h2>
			<p>When CP is plentiful, both progress and quality upper bounds become loose and stop pruning effectively. Raphael therefore computes a lower bound on the number of steps still required, even under ideal future actions, to satisfy both progress and quality.</p>
			<p>The recurrence resembles shortest path: <code>L(s)=0</code> once the relaxed target is met; otherwise <code>L(s)=1+min L(T(s,a))</code>. To remain a safe lower bound, it may relax CP limits or imagine stronger actions, but it must never overestimate the minimum number of real steps.</p>
			<p>If the current prefix has used 25 steps, at least 8 more are required, and a 30-step incumbent already exists, that branch cannot win on step count.</p>
			<p>This comparison is valid only after higher-priority goals are equal. A short plan that misses quality cannot dominate a longer max-quality plan.</p>
			<p>Ruri currently has a simplified <code>FinishStepLowerBound</code> based on the strongest progress potency available in the recipe. It has not yet implemented Raphael's complete dynamic-programming <code>StepLbSolver</code>. For now, this number helps order the queue rather than proving strict optimality.</p>

			<h2>Pareto Pruning: Keep Only States That Are Meaningfully Different</h2>
			<p>Consider two states, A and B, with the same condition, previous action, buff timers, and limited-resource context. Suppose A satisfies:</p>
			{{code:7}}
			<p>If at least one dimension is strictly better, A dominates B. Anything available after B is normally available after A, with resources no worse, so B does not need further expansion.</p>
			<p>A real implementation cannot compare only four numbers. Different buff durations, conditions, or previous actions change both action legality and payoff. Merging those states would create subtle correctness bugs.</p>
			<p>Ruri therefore puts Condition, PreviousAction, every relevant buff timer, Inner Quiet, Heart and Soul, Trained Perfection, and other limited resources into a <code>FrontierKey</code>. Only states with the same key compete on progress, quality, durability, and CP. A dominated candidate is discarded; a stronger candidate removes older states that it dominates.</p>
			<p>This is deduplication with a wider reach. It removes not only identical states but also states that differ numerically while being worse in every dimension that matters.</p>
			<p>Raphael uses bucketing and an approximate Pareto frontier to reduce dominance-check cost at a much larger scale. Ruri still uses a straightforward list per equivalent context.</p>

			<h2>How the Pieces Fit Together in Ruri</h2>
			<p>Quality objectives in Ruri now route to <code>GlobalCraftSearchSolver</code>. Its broad structure is:</p>
			{{code:8}}
			<p><code>CraftSimulator</code> is the source of truth for the entire system. Action legality, CP and durability costs, progress and quality gains, and buff ticking all go through the same simulator. If the search owns one fast approximation of the rules while execution owns another supposedly real one, they will eventually drift apart.</p>
			<p>At the beginning of a search, Ruri does three things:</p>
			<ol>
				<li>Validate that the state and ruleset are complete.</li>
				<li>Reject true physical dead ends with the optimistic progress bound.</li>
				<li>Use a heuristic planner to seed a finish-capable incumbent.</li>
			</ol>
			<p>Nodes then enter a priority queue. The priority observes current quality and progress, optimistic ceilings for both, the finish-step lower bound, and remaining CP and durability. Sorting only by quality would recreate the original problem: spend every resource on quality early, then discover that progress cannot finish.</p>
			<p>I ended up using a balanced score that gives an opener room to build Inner Quiet and quality buffs, then gradually hands priority to the progress bottleneck once the quality ramp matures.</p>
			<p>This is not Raphael's original scoring function. It is an engineering choice made for Ruri's real-time replanning.</p>
			<table><thead><tr><th>Role</th><th>Full Raphael approach</th><th>Current Ruri implementation</th></tr></thead><tbody>
				<tr><td>Main search</td><td>Best-first + branch-and-bound until optimality is proved</td><td>PriorityQueue with time, depth, and node budgets</td></tr>
				<tr><td>FinishSolver</td><td>Feasibility and bounds through compressed-state DP</td><td>Optimistic progress formula + bounded finish beam</td></tr>
				<tr><td>QualityUbSolver</td><td>Progress-quality Pareto DP over relaxed resources</td><td>Intentionally loose formula-based quality ceiling</td></tr>
				<tr><td>StepLbSolver</td><td>Safe step lower bound through DP</td><td>Simplified estimate from maximum progress potency</td></tr>
				<tr><td>Pareto</td><td>Bucketed approximate frontier for large state sets</td><td>List dominance within equivalent contexts</td></tr>
				<tr><td>Randomness</td><td>Optional adversarial worst-case mode</td><td>Separate expectimax route; deterministic live default</td></tr>
			</tbody></table>
			<p>Ruri can therefore prove that it found and replay-verified a plan satisfying the goal. It does not prove that the plan is the shortest among all legal plans. In particular, after reaching a max-quality terminal state, the live path prioritizes returning an executable first action instead of exhausting the queue to prove the shortest macro. That is the central trade-off between real-time execution and offline optimal solving.</p>

			<h2>Why I Added Semantic Action Sequences</h2>
			<p>Expanding one action at a time is clean, but under a one-second live budget the solver can spend most of its time visiting obvious intermediate states.</p>
			<p>Alongside individual actions, Ruri therefore considers several short sequences with useful crafting semantics:</p>
			{{code:9}}
			<p>These are not macros that bypass the simulator. Every action in a sequence is replayed and checked one by one. If any action is illegal, the sequence never enters the queue.</p>
			<p>It is like giving the search a few common phrases so it does not always have to build a sentence from individual letters.</p>
			<p>The cost is explicit. Semantic sequences, priorities, and finite budgets introduce heuristic bias. They help find practical plans quickly, but they are another reason the current implementation cannot be called a strict exact solver.</p>

			<h2>A Static Macro Is Not Enough: Replanning in the Live Client</h2>
			<p>Finding a complete offline plan does not mean the game should mechanically execute it from beginning to end.</p>
			<p>Real crafting conditions change, an action can be rejected, and the observer can temporarily lack a complete state. Ruri therefore uses a receding horizon for live execution:</p>
			{{code:10}}
			<p>The solver never needs to pretend it knows future conditions, and simulation error cannot accumulate over dozens of steps without correction.</p>
			<p>Executing only the first action does not make the full plan pointless. The complete plan demonstrates that at least one continuation exists behind the chosen action. Re-observation then anchors the next decision back in reality.</p>
			<p>If no state change is observed after sending an action, Ruri does not blindly send it again. Unknown state, timeout, session replacement, and resource inconsistency all fail closed. In an automation plugin, refusing to press an uncertain button is more important than trying to keep moving.</p>

			<h2>Where Stochastic Actions Belong</h2>
			<p>Raphael includes an adversarial mode that evaluates quality under the worst condition sequence, spending more computation to find macros robust to changing conditions. That objective is different from maximizing average return.</p>
			{{code:11}}
			<p>Ruri's <code>GlobalCraftSearchSolver</code> currently owns the deterministic, live-safe path. Actions with a success probability and probability-oriented analysis go through a separate <code>StochasticExpectimaxSolver</code>, where decision nodes and chance nodes alternate.</p>
			<p>Conservative live mode does not let the global search use random-success actions. One high-value failure can destroy the progress reserve the plan was meant to protect. A future adversarial backend should coexist with expectimax and make the choice between worst-case reliability and higher average return explicit.</p>

			<h2>What Actually Changed While Fixing Recipe 37825</h2>
			<p>Returning to the original log, this optimization became more than replacing one search routine. It required redefining what several results meant.</p>

			<h3>Physical State, Order Goal, and Solver Status Must Be Separate</h3>
			<p>The simulator reports physical outcomes such as completed progress or exhausted durability. The order layer decides whether HQ or collectable quality was met. The solver returns a separate set of statuses:</p>
			<ul>
				<li><code>Solved</code>: a complete plan was found and passed independent simulator replay.</li>
				<li><code>Partial</code>: a useful candidate exists, but the complete objective was not proved.</li>
				<li><code>TimedOut</code>: the time or node budget was exhausted.</li>
				<li><code>Infeasible</code>: hard evidence proves the goal unreachable.</li>
				<li><code>Unsupported</code>: the rules model is incomplete, so the solver refuses to guess.</li>
			</ul>
			<p>The dangerous old behavior was translating “this bounded search did not find a plan” into <code>Infeasible</code>. Without a proof, the honest result is timeout or partial.</p>

			<h3>Solved Must Be Simulated Again</h3>
			<p>When a search reports <code>Solved</code>, <code>SolverRouter</code> creates a fresh simulator and replays the entire plan from the original state:</p>
			<ol>
				<li>Every action must be legal.</li>
				<li>The terminal state must be a physical success, not durability failure.</li>
				<li>Final quality must satisfy the normalized order goal.</li>
			</ol>
			<p>A failure downgrades the result, and the invalid plan never enters the cache. Finding an answer and checking an answer become separate responsibilities.</p>

			<h3>The Cache Is Part of Algorithmic Correctness</h3>
			<p>The solver cache key includes recipe data, the complete crafting state, objective, risk options, time and node budgets, ruleset fingerprint, and algorithm version.</p>
			<p>Omitting <code>CanHq</code>, a buff, the previous action, or the rule version can make two merely similar requests reuse the same plan. A fast hit on a wrong cache entry only makes a bug more consistent.</p>

			<h2>Current Results, and What I Will Not Exaggerate</h2>
			<p>The Recipe 37825 regression scenario uses a set of values taken from the live log: 5865 craftsmanship, 5462 control, 664 CP, 9904 starting quality, 10040 required progress, and 21200 maximum quality.</p>
			<p>The current global search finds a replayable max-quality completion within the dry-run budget. Simulated live execution replans after each observation and eventually satisfies both progress and quality. Regression tests also cover a missing PreviousAction observation, an early Immaculate Mend, durability reduced to five, and states that have already become physical dead ends.</p>
			<p>Several qualifications remain:</p>
			<ul>
				<li>The reliable finish search is itself a bounded beam with width 16 and at most 8192 expansions, not Raphael's complete DP.</li>
				<li>The quality bound is a loose formula-based ceiling, without a shared CP currency or complete Pareto DP.</li>
				<li>The step lower bound is a simplified estimate.</li>
				<li>The main live search has a one-second, depth, and node budget.</li>
				<li>Balanced scoring and semantic action sequences make the result bounded and heuristic, without a strict optimality proof.</li>
				<li>Adversarial search over random conditions has not been implemented.</li>
				<li>Automated tests prove simulation contracts; they do not mean every recipe has been validated in the real Chinese client.</li>
			</ul>
			<p>I would rather leave those boundaries visible than hide them behind a phrase such as “AI optimal solver.” Whether an algorithm deserves trust begins with whether it describes honestly what it can prove.</p>

			<h2>How I Would Optimize It Next</h2>
			<p>If Ruri continues moving toward Raphael's architecture, the order should be deliberate.</p>
			<p>First, turn FinishSolver into a genuinely independent dynamic-programming problem. The current beam finds finish paths quickly, but “not found” does not always mean “does not exist.” Stronger memoization and state compression can reduce that uncertainty.</p>
			<p>Second, build a tighter quality upper bound. Convert durability, Manipulation, and limited resources into a shared budget, then maintain a <code>(progress, quality)</code> Pareto frontier. A tighter bound keeps the main search from spending time on imaginary high-quality continuations.</p>
			<p>Third, implement a complete StepLbSolver. It becomes especially useful when resources are plentiful, where it can prove that a path cannot beat the incumbent on step count.</p>
			<p>Fourth, replace the list-based frontier with buckets and measure dominance hit rates. Before optimizing, determine whether time is actually going into transitions, bounds, or dominance checks.</p>
			<p>Fifth, add adversarial mode and Monte Carlo replay. The former answers whether a plan survives worst-case conditions. The latter estimates the probability of reaching HQ or a collectable tier under an explicit probability model.</p>
			<p>Parallelism comes last. Without strong pruning, more threads simply generate useless states faster.</p>

			<h2>Closing Thoughts</h2>
			<p>Studying Raphael changed how I think about a crafting solver. It is not a machine that memorizes a rotation.</p>
			<p>What it really manages is a series of proofs.</p>
			<ul>
				<li>FinishSolver proves that a path still has the resources to finish.</li>
				<li>QualityUbSolver proves whether it still deserves to pursue the quality target.</li>
				<li>StepLbSolver proves whether it can still beat the current answer on length.</li>
				<li>The Pareto frontier proves which states are merely inferior duplicates.</li>
				<li>Independent replay proves that the answer returned by the search actually obeys the rules.</li>
			</ul>
			<p>Ruri has implemented only part of that path, with several practical compromises for a one-second live budget. Still, the false Recipe 37825 result left one useful principle embedded in the code:</p>
			<blockquote><p>Failing to find an answer does not mean no answer exists. Only call a goal infeasible when you can provide a proof.</p></blockquote>
			<p>That principle matters more than any single crafting macro.</p>

			<h2>References</h2>
			<ul>
				<li><a href="https://github.com/KonaeAkira/raphael-rs">KonaeAkira/raphael-rs</a></li>
				<li><a href="https://github.com/KonaeAkira/raphael-rs/wiki/Algorithm-Overview">Raphael Algorithm Overview</a></li>
				<li><a href="https://github.com/Tnze/ffxiv-best-craft">Tnze/ffxiv-best-craft</a></li>
				<li><a href="https://github.com/PunishXIV/Artisan">PunishXIV/Artisan</a></li>
			</ul>
		`, Array.from({ length: 12 }, (_, index) => index)),
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
