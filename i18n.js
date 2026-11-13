/*
	@author: [DaiEn]
	@Date: 2026-11-14
	@Correction: 1
*/
(function () {
	'use strict';

	var KEY = 'eggshellcat-lang'; // localStorage 的鍵：記住上次選的語言
	var DEFAULT_LANG = 'zh-Hant'; // 進站預設中文
	var root = document.documentElement;

	// 語言字典：鍵對應 HTML 裡的 data-i18n，值是那一句在該語言下的寫法。
	// 要加新句子：HTML 上掛 data-i18n="xxx"，這裡兩種語言各補一條就好。
	var DICT = {
		'zh-Hant': {
			title: '蛋殼喵 DaiEn — 作家・程序員・企業負責人',
			description: '蛋殼喵 DaiEn',
			brand: '蛋殼喵',
			brandSub: 'DaiEn',
			roles1: '作家・程序員',
			roles2: '寫下來的，才開始存在',
			lede: '白天寫程式，晚上寫小說。兩件事其實是同一件：把一段看不見的節奏，變成別人也能感受到的東西。',
			sigLabel: '一切过往，一切未来\u00a0\u00a0\u00a0\u00a0存在之轮，永恒流转',
			workTitle: '作品',
			work1: '如果死亡只是起點',
			work2: '蛋壳喵 APNG 工具',
			work3: 'GitHub 託管代碼',
			rolesTitle: '我在做的事',
			role1Label: '作家',
			role1Note: '長篇小說，人物與世界觀設定；喜歡把複雜的東西寫到能被讀懂。',
			role2Label: '程序員',
			role2Note: '原生 JavaScript 與 Canvas，不用框架、不加建置，一個靜態資料夾就能跑。',
		},
		en: {
			title: 'DaiEn — Writer・Programmer',
			description: 'DaiEn',
			brand: 'DaiEn',
			brandSub: 'Eggshell Cat',
			roles1: 'Writer・Programmer',
			roles2: 'Nothing exists until it is written.',
			lede: 'Code by day, fiction by night. They are really the same job: giving an invisible rhythm a shape someone else can feel.',
			sigLabel: 'Alles Vergangene, alles Kommende — ewig dreht sich das Rad des Seins',
			workTitle: 'Works',
			work1: 'If Death Were Only the Beginning',
			work2: 'Eggshell Cat APNG Tool',
			work3: 'Code hosted on GitHub',
			rolesTitle: 'What I do',
			role1Label: 'Writer',
			role1Note:
				'Long-form fiction, characters and world-building; I like writing complicated things until they are readable.',
			role2Label: 'Programmer',
			role2Note: 'Plain JavaScript and Canvas. No framework, no build step — one static folder still runs.',
		},
	};

	// 這個語言到底有沒有字典；沒有就退回預設，免得整頁變空白
	function pick(lang) {
		return DICT[lang] ? lang : DEFAULT_LANG;
	}

	// 把某一種語言套到整頁：文字、<html lang>、標題、描述
	function apply(lang) {
		lang = pick(lang);
		var t = DICT[lang];

		root.lang = lang;

		var nodes = document.querySelectorAll('[data-i18n]');
		for (var i = 0; i < nodes.length; i++) {
			var key = nodes[i].getAttribute('data-i18n');
			// 字典缺這句時保留原本的中文，至少不會變成空氣
			if (t[key] != null) nodes[i].textContent = t[key];
		}

		if (t.title) document.title = t.title;
		var meta = document.querySelector('meta[name="description"]');
		if (meta && t.description) meta.setAttribute('content', t.description);

		// 切換鈕的無障礙標籤也跟著語言走
		var btn = document.getElementById('langBtn');
		if (btn) btn.setAttribute('aria-label', lang === 'zh-Hant' ? 'Switch to English' : '切換成中文');
	}

	// 目前該用哪個語言：網址上的 ?lang= 優先（給分享連結用），
	// 其次是上次的選擇，都沒有就中文
	function initialLang() {
		var q = (location.search.match(/[?&]lang=([^&]+)/) || [])[1];
		if (q) {
			var v = decodeURIComponent(q).toLowerCase();
			if (v.indexOf('en') === 0) return 'en';
			if (v.indexOf('zh') === 0) return 'zh-Hant';
		}
		try {
			var saved = localStorage.getItem(KEY);
			if (saved && DICT[saved]) return saved;
		} catch (e) {
			// 無痕模式或禁用 storage 時就別理它，用預設值
		}
		return DEFAULT_LANG;
	}

	function save(lang) {
		try {
			localStorage.setItem(KEY, lang);
		} catch (e) {
			// 存不了就算了，切換本身還是有效的
		}
	}

	// 換成另一種語言；兩種語言互為切換目標
	function flip() {
		var next = root.lang === 'en' ? 'zh-Hant' : 'en';
		apply(next);
		save(next);
	}

	var first = initialLang();
	apply(first);

	var topBtn = document.getElementById('langBtn');
	if (topBtn) topBtn.addEventListener('click', flip);

	var footBtn = document.getElementById('footLangBtn');
	if (footBtn) footBtn.addEventListener('click', flip);
})();
