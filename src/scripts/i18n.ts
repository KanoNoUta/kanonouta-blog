import { applyArticleTranslation } from './articleTranslations';

type LanguageKey = 'zh' | 'ja' | 'en';

type LanguagePack = {
	htmlLang: string;
	locale: string;
	text: Record<string, string>;
	mapNames: Record<string, string>;
	mapRegions: Record<string, string>;
	mapNotes: Record<string, string>;
};

const languageStorageKey = 'kano-language';

const languages: Record<LanguageKey, LanguagePack> = {
	zh: {
		htmlLang: 'zh-CN',
		locale: 'zh-CN',
		text: {
			navLabel: '主导航',
			brandLabel: 'Kano no Uta',
			brandCjk: '鹿の歌',
			openNav: '打开导航',
			home: '首页',
			posts: '文章',
			links: '友链',
			lab: 'Lab',
			labMenu: 'Lab 子菜单',
			languageLabel: '语言',
			languageZh: '中文',
			languageJa: '日语',
			languageEn: '英语',
			map: '地图',
			about: '关于',
			pageHomeTitle: 'Kano no Uta',
			pageHomeDescription: 'Kano 的个人博客，记录技术、生活和一些重新开始的念头。',
			pageAboutTitle: '关于 - Kano no Uta',
			pageAboutDescription: '关于 Kano 和这个叫 Kano no Uta 的个人博客。',
			pageBlogTitle: '文章 - Kano no Uta',
			pageBlogDescription: 'Kano 的个人博客，记录技术、生活和一些重新开始的念头。',
			pageLinksTitle: '友链 - Kano no Uta',
			pageLinksDescription: 'Kano no Uta 的友链页面。',
			pageLabTitle: 'Lab - Kano no Uta',
			pageLabDescription: 'Kano no Uta 的实验室页面。',
			pageMapTitle: '足迹地图 - Kano no Uta',
			pageMapDescription: 'Kano 的足迹地图，记录已经点亮的城市。',
			homeHeroGreetingPrefix: 'Hi, I\'m ',
			homeHeroGreetingSuffix: '',
			homeStatsLabel: '站点统计',
			unitPost: '篇',
			wordPrefix: '约',
			unitWord: '字',
			staticSite: 'Astro 静态站',
			iconPostsLabel: '文章',
			iconAboutLabel: '关于',
			iconPostsText: '文',
			iconAboutText: '我',
			homeSecondLabel: '站点状态',
			consoleAreaStatus: 'AREA STATUS',
			consolePosts: 'POSTS',
			consoleWords: 'WORDS',
			consoleMode: 'MODE',
			consoleStatic: 'STATIC',
			homeContentLabel: '主页内容',
			homeRecentLabel: 'Recent Writing',
			homeRecentTitle: '近期笔墨',
			homeThoughtsTitle: '碎念',
			homeThoughtsText: '博客先从简单开始：写文章、存档、RSS、友链。复杂的东西慢一点长出来，比较像真的生活。',
			homeTodoTitle: '待补',
			homeTodoMigrate: '迁移旧文章',
			homeTodoLinks: '友链页',
			homeTodoTags: '标签和归档',
			homeTodoComments: '评论系统',
			homeClosingLabel: '站点动作',
			homeClosingLine1: 'High summer greetings',
			homeClosingLine2: 'Welcome to write',
			homeClosingLeave: 'Leave a mark',
			homeClosingFriends: '♥ 友链',
			homeClosingSubscribe: 'Subscribe',
			homeClosingSubscribeSub: 'Never miss a letter',
			aboutEyebrow: 'About',
			aboutTitle: '关于 Kano',
			aboutLead: '这里是一个重新开始写博客的人，和一个还在慢慢成形的小站。',
			aboutP1: '你好，我是 Kano。这里是我重新整理出来的个人博客，名字叫 Kano no Uta。',
			aboutP2: '它会先做一件很朴素的事：把文字留下来。技术笔记、踩坑记录、日常随笔、友链、旧文章迁移，都可以慢慢来。',
			aboutContactTitle: '联系方式',
			aboutTechTitle: '关于这个站点',
			aboutTechText: '使用 Astro 构建，部署在静态托管服务上。设计风格受到 Yohaku 和 async-area 的启发，融合了留白的克制与像素风格的复古感。',
			aboutFramework: '框架：',
			aboutStyle: '样式：',
			aboutFonts: '字体：',
			aboutDeploy: '部署：',
			nativeCss: '原生 CSS + CSS Variables',
			siteFonts: '系统字体 + BoutiqueBitmap',
			staticHosting: '静态托管',
			blogEyebrow: 'Posts',
			blogTitle: '文章',
			blogLead: '按时间收起的记录。技术、生活、折腾，以及一些当下还没想清楚但值得留下的念头。',
			blogListLabel: '文章列表',
			articleType: '文章',
			articleUpdated: '更新于',
			linksEyebrow: 'Friends',
			linksTitle: '友链',
			linksLead: '独立博客的门牌不只指向自己，也应该指向一些还在认真写东西的人。',
			blogrollTitle: '博客友链',
			recommendedLinksTitle: '推荐链接',
			friendDiygodDesc: '独立博客和中文互联网里很熟悉的名字。',
			friendAstroDesc: 'The web framework for content-driven websites.',
			linksApplyTitle: '申请友链',
			linksApplyText: '如果你想交换友链，欢迎通过邮件或 GitHub 联系我。',
			linksApplyName: '网站名称：Kano no Uta',
			linksApplyUrl: '网站地址：https://kanonouta.com',
			linksApplyDesc: '网站描述：Kano 的个人博客',
			labTitlePage: '实验室',
			labLead: '一些不一定要写成长文章的小玩具、小页面和小地图。',
			labProjectsLabel: '实验室项目',
			labMapTitle: '足迹地图',
			labMapDesc: '把去过的城市点亮，像素风旧地图版。',
			mapToolbarLabel: '地图状态',
			mapBackLabLabel: '返回 Lab',
			mapProgressLabel: '探索进度',
			mapExplored: '已探索',
			mapCityUnit: '城市',
			mapZoomIn: '放大地图',
			mapReset: '重置地图',
			mapZoomOut: '缩小地图',
			mapLegendDistance: '约 800 km',
			mapTitleSvg: 'Kano 的足迹地图',
			mapDescSvg: '点亮的城市包括珠海、澳门、香港、大阪、九州、东京、陕西、山西、北京、四川和重庆。',
			mapChinaLabel: '中国地图',
			mapJapanLabel: '日本地图',
			mapInsetLabel: '南海群岛示意',
			mapMarkerAction: '点击或回车聚焦此城市。',
			footerNavTitle: '导航',
			footerSubscribeTitle: '订阅',
			footerContactTitle: '联系',
			footerArchive: '文章归档',
			footerWritten: 'Kano. Written at kanonouta.com.',
			footerPowered: 'Powered by Astro.',
			'post.back-to-blog.title': '回到博客',
			'post.back-to-blog.description': '域名回来了，博客也重新开始。',
			'post.back-to-blog.pageTitle': '回到博客 - Kano no Uta',
			'post.ffxiv-acr-devlog.title': '从零到可发布：KANO 暗黑骑士 ACR 开发笔记',
			'post.ffxiv-acr-devlog.description': '一篇偏教学的开发记录：如何把暗黑骑士 ACR 从基础循环、爆发、QT、Hotkey、配置保存做到打包发布。',
			'post.ffxiv-acr-devlog.pageTitle': '从零到可发布：KANO 暗黑骑士 ACR 开发笔记 - Kano no Uta',
		},
		mapNames: {},
		mapRegions: {},
		mapNotes: {},
	},
	ja: {
		htmlLang: 'ja',
		locale: 'ja-JP',
		text: {
			navLabel: 'メインナビゲーション',
			brandLabel: 'Kano no Uta',
			brandCjk: '鹿の歌',
			openNav: 'ナビゲーションを開く',
			home: 'ホーム',
			posts: '記事',
			links: 'リンク',
			lab: 'Lab',
			labMenu: 'Lab サブメニュー',
			languageLabel: '言語',
			languageZh: '中国語',
			languageJa: '日本語',
			languageEn: '英語',
			map: '地図',
			about: 'プロフィール',
			pageHomeTitle: 'Kano no Uta',
			pageHomeDescription: 'Kano の個人ブログ。技術、暮らし、そして再出発のことを記録します。',
			pageAboutTitle: 'プロフィール - Kano no Uta',
			pageAboutDescription: 'Kano と Kano no Uta という個人ブログについて。',
			pageBlogTitle: '記事 - Kano no Uta',
			pageBlogDescription: 'Kano の個人ブログ。技術、暮らし、そして再出発のことを記録します。',
			pageLinksTitle: 'リンク - Kano no Uta',
			pageLinksDescription: 'Kano no Uta のリンクページ。',
			pageLabTitle: 'Lab - Kano no Uta',
			pageLabDescription: 'Kano no Uta の実験室ページ。',
			pageMapTitle: '足跡地図 - Kano no Uta',
			pageMapDescription: 'Kano が訪れた街を記録する足跡地図。',
			homeHeroGreetingPrefix: 'こんにちは、',
			homeHeroGreetingSuffix: 'です',
			homeStatsLabel: 'サイト統計',
			unitPost: '件',
			wordPrefix: '約',
			unitWord: '字',
			staticSite: 'Astro 静的サイト',
			iconPostsLabel: '記事',
			iconAboutLabel: 'プロフィール',
			iconPostsText: '記',
			iconAboutText: '私',
			homeSecondLabel: 'サイト状態',
			consoleAreaStatus: 'AREA STATUS',
			consolePosts: 'POSTS',
			consoleWords: 'WORDS',
			consoleMode: 'MODE',
			consoleStatic: 'STATIC',
			homeContentLabel: 'ホーム内容',
			homeRecentLabel: 'Recent Writing',
			homeRecentTitle: '最近の文章',
			homeThoughtsTitle: 'メモ',
			homeThoughtsText: 'ブログはまずシンプルに始めます。記事を書く、アーカイブする、RSS、リンク。複雑なものは少しずつ育てます。そのほうが暮らしに近いから。',
			homeTodoTitle: 'これから',
			homeTodoMigrate: '昔の記事を移す',
			homeTodoLinks: 'リンクページ',
			homeTodoTags: 'タグとアーカイブ',
			homeTodoComments: 'コメント機能',
			homeClosingLabel: 'サイトアクション',
			homeClosingLine1: '夏のご挨拶',
			homeClosingLine2: '書く場所へようこそ',
			homeClosingLeave: '足跡を残す',
			homeClosingFriends: '♥ リンク',
			homeClosingSubscribe: '購読する',
			homeClosingSubscribeSub: '新しい便りを逃さない',
			aboutEyebrow: 'About',
			aboutTitle: 'Kano について',
			aboutLead: 'ここは、もう一度ブログを書き始める人と、少しずつ形になっていく小さなサイトです。',
			aboutP1: 'こんにちは、Kano です。ここは整理し直した個人ブログで、名前は Kano no Uta です。',
			aboutP2: 'まずはとても素朴なことをします。言葉を残すこと。技術メモ、失敗の記録、日常の随筆、リンク、昔の記事の移行を少しずつ進めます。',
			aboutContactTitle: '連絡先',
			aboutTechTitle: 'このサイトについて',
			aboutTechText: 'Astro で構築し、静的ホスティングに配置しています。デザインは Yohaku と async-area に着想を得て、余白の抑制とピクセル風の懐かしさを合わせています。',
			aboutFramework: 'フレームワーク：',
			aboutStyle: 'スタイル：',
			aboutFonts: 'フォント：',
			aboutDeploy: 'デプロイ：',
			nativeCss: 'ネイティブ CSS + CSS Variables',
			siteFonts: 'システムフォント + BoutiqueBitmap',
			staticHosting: '静的ホスティング',
			blogEyebrow: 'Posts',
			blogTitle: '記事',
			blogLead: '時間順にまとめた記録。技術、暮らし、試行錯誤、そしてまだ答えは出ていないけれど残しておきたい考え。',
			blogListLabel: '記事一覧',
			articleType: '記事',
			articleUpdated: '更新',
			linksEyebrow: 'Friends',
			linksTitle: 'リンク',
			linksLead: '個人ブログの表札は自分だけでなく、今も真剣に書いている人たちにも向いていてほしい。',
			blogrollTitle: 'ブログリンク',
			recommendedLinksTitle: 'おすすめリンク',
			friendDiygodDesc: '個人ブログと中国語インターネットでよく知られた名前。',
			friendAstroDesc: 'コンテンツ中心サイトのための Web フレームワーク。',
			linksApplyTitle: 'リンク申請',
			linksApplyText: 'リンク交換をしたい場合は、メールまたは GitHub から連絡してください。',
			linksApplyName: 'サイト名：Kano no Uta',
			linksApplyUrl: 'URL：https://kanonouta.com',
			linksApplyDesc: '説明：Kano の個人ブログ',
			labTitlePage: '実験室',
			labLead: '長い記事にしなくてもいい小さな道具、小さなページ、小さな地図。',
			labProjectsLabel: 'Lab プロジェクト',
			labMapTitle: '足跡地図',
			labMapDesc: '訪れた街を灯す、ピクセル風の古地図版。',
			mapToolbarLabel: '地図ステータス',
			mapBackLabLabel: 'Lab に戻る',
			mapProgressLabel: '探索進度',
			mapExplored: '探索済み',
			mapCityUnit: '都市',
			mapZoomIn: '地図を拡大',
			mapReset: '地図をリセット',
			mapZoomOut: '地図を縮小',
			mapLegendDistance: '約 800 km',
			mapTitleSvg: 'Kano の足跡地図',
			mapDescSvg: '灯した都市は珠海、マカオ、香港、大阪、九州、東京、陝西、山西、北京、四川、重慶です。',
			mapChinaLabel: '中国地図',
			mapJapanLabel: '日本地図',
			mapInsetLabel: '南シナ海諸島の模式図',
			mapMarkerAction: 'クリックまたは Enter でこの都市にフォーカスします。',
			footerNavTitle: 'ナビゲーション',
			footerSubscribeTitle: '購読',
			footerContactTitle: '連絡',
			footerArchive: '記事アーカイブ',
			footerWritten: 'Kano. kanonouta.com にて執筆。',
			footerPowered: 'Astro で構築。',
			'post.back-to-blog.title': 'ブログへ戻る',
			'post.back-to-blog.description': 'ドメインが戻ってきて、ブログももう一度始まります。',
			'post.back-to-blog.pageTitle': 'ブログへ戻る - Kano no Uta',
			'post.ffxiv-acr-devlog.title': 'ゼロから公開まで：KANO 暗黒騎士 ACR 開発ノート',
			'post.ffxiv-acr-devlog.description': '基礎ループ、バースト、QT、Hotkey、設定保存から配布までを整理した、教学寄りの開発記録。',
			'post.ffxiv-acr-devlog.pageTitle': 'ゼロから公開まで：KANO 暗黒騎士 ACR 開発ノート - Kano no Uta',
		},
		mapNames: {
			北京: '北京',
			陕西: '陝西',
			山西: '山西',
			四川: '四川',
			重庆: '重慶',
			珠海: '珠海',
			澳门: 'マカオ',
			香港: '香港',
			东京: '東京',
			大阪: '大阪',
			九州: '九州',
			日本: '日本',
			中国地图: '中国地図',
			日本地图: '日本地図',
			南海群岛示意: '南シナ海諸島の模式図',
		},
		mapRegions: {
			华北: '華北',
			西北: '西北',
			西南: '西南',
			华南: '華南',
			日本: '日本',
		},
		mapNotes: {
			北方坐标: '北の座標',
			关中一带: '関中あたり',
			山河之间: '山河のあいだ',
			盆地与山: '盆地と山',
			山城灯火: '山城の灯り',
			海边: '海辺',
			口岸与街巷: '港と路地',
			维港方向: 'ビクトリア・ハーバー方面',
			关东: '関東',
			关西: '関西',
			岛屿南端: '島の南端',
		},
	},
	en: {
		htmlLang: 'en',
		locale: 'en-US',
		text: {
			navLabel: 'Main navigation',
			brandLabel: 'Kano no Uta',
			brandCjk: '鹿の歌',
			openNav: 'Open navigation',
			home: 'Home',
			posts: 'Posts',
			links: 'Links',
			lab: 'Lab',
			labMenu: 'Lab submenu',
			languageLabel: 'Language',
			languageZh: 'Chinese',
			languageJa: 'Japanese',
			languageEn: 'English',
			map: 'Map',
			about: 'About',
			pageHomeTitle: 'Kano no Uta',
			pageHomeDescription: 'Kano\'s personal blog about technology, life, and small restarts.',
			pageAboutTitle: 'About - Kano no Uta',
			pageAboutDescription: 'About Kano and the personal blog called Kano no Uta.',
			pageBlogTitle: 'Posts - Kano no Uta',
			pageBlogDescription: 'Kano\'s personal blog about technology, life, and small restarts.',
			pageLinksTitle: 'Links - Kano no Uta',
			pageLinksDescription: 'The links page of Kano no Uta.',
			pageLabTitle: 'Lab - Kano no Uta',
			pageLabDescription: 'The lab page of Kano no Uta.',
			pageMapTitle: 'Footprint Map - Kano no Uta',
			pageMapDescription: 'Kano\'s footprint map, recording the cities already lit up.',
			homeHeroGreetingPrefix: 'Hi, I\'m ',
			homeHeroGreetingSuffix: '',
			homeStatsLabel: 'Site statistics',
			unitPost: 'posts',
			wordPrefix: 'about',
			unitWord: 'characters',
			staticSite: 'Astro static site',
			iconPostsLabel: 'Posts',
			iconAboutLabel: 'About',
			iconPostsText: 'P',
			iconAboutText: 'A',
			homeSecondLabel: 'Site status',
			consoleAreaStatus: 'AREA STATUS',
			consolePosts: 'POSTS',
			consoleWords: 'WORDS',
			consoleMode: 'MODE',
			consoleStatic: 'STATIC',
			homeContentLabel: 'Home content',
			homeRecentLabel: 'Recent Writing',
			homeRecentTitle: 'Recent Notes',
			homeThoughtsTitle: 'Notes',
			homeThoughtsText: 'The blog starts simple: writing, archives, RSS, and links. More complex things can grow slowly, closer to real life.',
			homeTodoTitle: 'To do',
			homeTodoMigrate: 'Migrate old posts',
			homeTodoLinks: 'Links page',
			homeTodoTags: 'Tags and archives',
			homeTodoComments: 'Comment system',
			homeClosingLabel: 'Site actions',
			homeClosingLine1: 'High summer greetings',
			homeClosingLine2: 'Welcome to write',
			homeClosingLeave: 'Leave a mark',
			homeClosingFriends: '♥ Links',
			homeClosingSubscribe: 'Subscribe',
			homeClosingSubscribeSub: 'Never miss a letter',
			aboutEyebrow: 'About',
			aboutTitle: 'About Kano',
			aboutLead: 'A person starting a blog again, and a small site still slowly taking shape.',
			aboutP1: 'Hi, I am Kano. This is my newly organized personal blog, called Kano no Uta.',
			aboutP2: 'It will begin with something plain: keeping words. Technical notes, debugging records, daily essays, links, and old post migration can all move slowly.',
			aboutContactTitle: 'Contact',
			aboutTechTitle: 'About this site',
			aboutTechText: 'Built with Astro and deployed on static hosting. The design is inspired by Yohaku and async-area, mixing restrained white space with a nostalgic pixel style.',
			aboutFramework: 'Framework:',
			aboutStyle: 'Style:',
			aboutFonts: 'Fonts:',
			aboutDeploy: 'Deploy:',
			nativeCss: 'Native CSS + CSS Variables',
			siteFonts: 'System fonts + BoutiqueBitmap',
			staticHosting: 'Static hosting',
			blogEyebrow: 'Posts',
			blogTitle: 'Posts',
			blogLead: 'Records gathered by time: technology, life, tinkering, and thoughts that are not clear yet but still worth keeping.',
			blogListLabel: 'Post list',
			articleType: 'Post',
			articleUpdated: 'Updated',
			linksEyebrow: 'Friends',
			linksTitle: 'Links',
			linksLead: 'A personal blog sign should not only point to itself. It should also point to people who are still writing carefully.',
			blogrollTitle: 'Blogroll',
			recommendedLinksTitle: 'Recommended Links',
			friendDiygodDesc: 'A familiar name in independent blogging and the Chinese web.',
			friendAstroDesc: 'The web framework for content-driven websites.',
			linksApplyTitle: 'Apply for a link',
			linksApplyText: 'If you want to exchange links, feel free to contact me by email or GitHub.',
			linksApplyName: 'Site name: Kano no Uta',
			linksApplyUrl: 'Site URL: https://kanonouta.com',
			linksApplyDesc: 'Description: Kano\'s personal blog',
			labTitlePage: 'Lab',
			labLead: 'Small toys, small pages, and small maps that do not always need to become long articles.',
			labProjectsLabel: 'Lab projects',
			labMapTitle: 'Footprint Map',
			labMapDesc: 'Light up cities I have visited, in a pixel-style old map edition.',
			mapToolbarLabel: 'Map status',
			mapBackLabLabel: 'Back to Lab',
			mapProgressLabel: 'Exploration progress',
			mapExplored: 'Explored',
			mapCityUnit: 'cities',
			mapZoomIn: 'Zoom in',
			mapReset: 'Reset map',
			mapZoomOut: 'Zoom out',
			mapLegendDistance: 'about 800 km',
			mapTitleSvg: 'Kano\'s footprint map',
			mapDescSvg: 'Lit cities include Zhuhai, Macau, Hong Kong, Osaka, Kyushu, Tokyo, Shaanxi, Shanxi, Beijing, Sichuan, and Chongqing.',
			mapChinaLabel: 'Map of China',
			mapJapanLabel: 'Map of Japan',
			mapInsetLabel: 'South China Sea islands inset',
			mapMarkerAction: 'Click or press Enter to focus this city.',
			footerNavTitle: 'Navigation',
			footerSubscribeTitle: 'Subscribe',
			footerContactTitle: 'Contact',
			footerArchive: 'Post archive',
			footerWritten: 'Kano. Written at kanonouta.com.',
			footerPowered: 'Powered by Astro.',
			'post.back-to-blog.title': 'Back to Blogging',
			'post.back-to-blog.description': 'The domain is back, and the blog begins again.',
			'post.back-to-blog.pageTitle': 'Back to Blogging - Kano no Uta',
			'post.ffxiv-acr-devlog.title': 'From Zero to Release: KANO Dark Knight ACR Development Notes',
			'post.ffxiv-acr-devlog.description': 'A teaching-oriented devlog on building a Dark Knight ACR from basic rotation, burst logic, QT, Hotkey, and settings persistence to release packaging.',
			'post.ffxiv-acr-devlog.pageTitle': 'From Zero to Release: KANO Dark Knight ACR Development Notes - Kano no Uta',
		},
		mapNames: {
			北京: 'Beijing',
			陕西: 'Shaanxi',
			山西: 'Shanxi',
			四川: 'Sichuan',
			重庆: 'Chongqing',
			珠海: 'Zhuhai',
			澳门: 'Macau',
			香港: 'Hong Kong',
			东京: 'Tokyo',
			大阪: 'Osaka',
			九州: 'Kyushu',
			日本: 'Japan',
			中国地图: 'Map of China',
			日本地图: 'Map of Japan',
			南海群岛示意: 'South China Sea islands inset',
		},
		mapRegions: {
			华北: 'North China',
			西北: 'Northwest China',
			西南: 'Southwest China',
			华南: 'South China',
			日本: 'Japan',
		},
		mapNotes: {
			北方坐标: 'Northern point',
			关中一带: 'Around Guanzhong',
			山河之间: 'Between mountains and rivers',
			盆地与山: 'Basin and mountains',
			山城灯火: 'Lights of the mountain city',
			海边: 'By the sea',
			口岸与街巷: 'Ports and lanes',
			维港方向: 'Toward Victoria Harbour',
			关东: 'Kanto',
			关西: 'Kansai',
			岛屿南端: 'Southern end of the islands',
		},
	},
};

const isLanguageKey = (value: string | null): value is LanguageKey =>
	value === 'zh' || value === 'ja' || value === 'en';

const getText = (languagePack: LanguagePack, key: string | undefined): string | undefined => {
	if (!key) return undefined;
	return languagePack.text[key];
};

const setDocumentMeta = (languagePack: LanguagePack): void => {
	const pageKey = document.body.dataset.i18nPage;
	if (!pageKey) return;

	const staticPageName = pageKey[0]?.toUpperCase() + pageKey.slice(1);
	const title = getText(languagePack, `${pageKey}.pageTitle`) ?? getText(languagePack, `page${staticPageName}Title`);
	const description =
		getText(languagePack, `${pageKey}.description`) ??
		getText(languagePack, `page${staticPageName}Description`);

	if (title) {
		document.title = title;
		document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
	}

	if (description) {
		document.querySelector('meta[name="description"]')?.setAttribute('content', description);
		document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
	}
};

const formatDates = (languagePack: LanguagePack): void => {
	const formatter = new Intl.DateTimeFormat(languagePack.locale, {
		year: 'numeric',
		month: '2-digit',
		day: 'numeric',
	});

	document.querySelectorAll<HTMLTimeElement>('time[data-i18n-date]').forEach((element) => {
		const date = new Date(element.dateTime);
		if (Number.isNaN(date.getTime())) return;
		element.textContent = formatter.format(date);
	});
};

const translateMapText = (languagePack: LanguagePack): void => {
	document.querySelectorAll<Element>('[data-map-name]').forEach((element) => {
		const sourceName = element.getAttribute('data-map-name-source') ?? element.getAttribute('data-map-name');
		if (!sourceName) return;

		element.setAttribute('data-map-name-source', sourceName);
		const translatedName = languagePack.mapNames[sourceName] ?? sourceName;
		element.setAttribute('data-map-name', translatedName);

		Array.from(element.children)
			.find((child) => child.tagName.toLowerCase() === 'title')
			?.replaceChildren(translatedName);

		if (element.classList.contains('place-marker')) {
			const sourceRegion = element.getAttribute('data-map-region-source') ?? element.getAttribute('data-map-region') ?? '';
			const sourceNote = element.getAttribute('data-map-note-source') ?? element.getAttribute('data-map-note') ?? '';
			element.setAttribute('data-map-region-source', sourceRegion);
			element.setAttribute('data-map-note-source', sourceNote);

			const translatedRegion = languagePack.mapRegions[sourceRegion] ?? sourceRegion;
			const translatedNote = languagePack.mapNotes[sourceNote] ?? sourceNote;
			element.setAttribute('data-map-region', translatedRegion);
			element.setAttribute('data-map-note', translatedNote);
			element.setAttribute('aria-label', `${translatedName}, ${translatedRegion}, ${translatedNote}. ${languagePack.text.mapMarkerAction}`);
		}
	});
};

const applyLanguage = (language: LanguageKey, shouldStore = true): void => {
	const languagePack = languages[language];

	document.documentElement.lang = languagePack.htmlLang;
	document.documentElement.dataset.language = language;

	document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((element) => {
		const text = getText(languagePack, element.dataset.i18n);
		if (text === undefined) return;
		element.textContent = text;
	});

	document.querySelectorAll<HTMLElement>('[data-i18n-html]').forEach((element) => {
		const text = getText(languagePack, element.dataset.i18nHtml);
		if (text === undefined) return;
		element.innerHTML = text;
	});

	document.querySelectorAll<HTMLElement>('[data-i18n-aria-label]').forEach((element) => {
		const text = getText(languagePack, element.dataset.i18nAriaLabel);
		if (text === undefined) return;
		element.setAttribute('aria-label', text);
	});

	document.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((element) => {
		const text = getText(languagePack, element.dataset.i18nTitle);
		if (text === undefined) return;
		element.setAttribute('title', text);
	});

	document.querySelectorAll<HTMLButtonElement>('[data-lang-button]').forEach((button) => {
		const isCurrent = button.dataset.langButton === language;
		button.setAttribute('aria-pressed', String(isCurrent));
	});

	setDocumentMeta(languagePack);
	formatDates(languagePack);
	translateMapText(languagePack);
	applyArticleTranslation(language);

	if (shouldStore) {
		window.localStorage.setItem(languageStorageKey, language);
	}

	window.dispatchEvent(new CustomEvent('kano:language-change', { detail: { language } }));
};

const storedLanguage = window.localStorage.getItem(languageStorageKey);
const defaultLanguage = isLanguageKey(storedLanguage) ? storedLanguage : 'zh';

applyLanguage(defaultLanguage, false);

document.querySelectorAll<HTMLButtonElement>('[data-lang-button]').forEach((button) => {
	button.addEventListener('click', () => {
		const nextLanguage = button.dataset.langButton;
		if (isLanguageKey(nextLanguage ?? null)) {
			applyLanguage(nextLanguage);
		}
	});
});
