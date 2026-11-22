/*
	@author: [DaiEn]
	@Date: 2026-11-23
	@Correction: 5
*/
(function () {
	'use strict';

	var KEY = 'eggshellcat-lang'; // localStorage 的鍵：記住上次選的語言
	var DEFAULT_LANG = 'zh-Hant'; // 進站預設中文
	var root = document.documentElement;

	// 語言字典：鍵對應 HTML 裡的 data-i18n，值是那一句在該語言下的寫法。
	// 要加新句子：HTML 上掛 data-i18n="xxx"，這裡三種語言各補一條就好。
	var DICT = {
		'zh-Hant': {
			title: '蛋壳喵 DaiEn — 作家・程序员',
			description: '蛋壳喵 DaiEn',
			brand: '蛋壳喵',
			brandSub: 'DaiEn',
			roles1: '作家・程序员',
			roles2: '写下来的，才开始存在',
			lede: '白天写程式，晚上写小说。两件事其实是同一件：把一段看不见的节奏，变成别人也能感受到的东西。',
			sigLabel: '一切过往，一切未来\u00a0\u00a0\u00a0\u00a0存在之轮，永恒流转',
			workTitle: '作品',
			linkTitle: '連接',
			work1: '如果死亡只是起点',
			work2: '蛋壳喵 APNG 工具',
			work3: 'GitHub 托管代码',
			work4: '蛋壳大冒险',
			work5: '蛋壳大冒险-地图障碍点设置工具',
			work6: '蛋壳大冒险-关卡生成工具',
			work7: '蛋壳喵 Emoji',
			work8: '蛋壳大冒险-NPC图片查看工具',
			work9: '蛋壳大冒险-MAIN视频检视工具',
			rolesTitle: '我在做的事',
			role1Label: '作家',
			role1Note: '长篇小说，人物与世界观设定；喜欢把复杂的东西写到能被读懂。嗯！？看不懂...那就对了！',
			role2Label: '程序员',
			role2Note: '‌JavaScript、TypeScript、JAVA、Kotlin‌、C++、C# 嗯~这些都略懂，稍微能应用，自己能瞎搞出很多游戏。',
		},
		en: {
			title: 'Eggshell Cat DaiEn — Writer・Programmer',
			description: 'Eggshell Cat DaiEn',
			brand: 'Eggshell Cat',
			brandSub: 'DaiEn',
			roles1: 'Writer・Programmer',
			roles2: 'Nothing exists until it is written.',
			lede: 'Code by day, fiction by night. They are really the same job: giving an invisible rhythm a shape someone else can feel.',
			sigLabel: 'Alles Vergangene, alles Kommende — ewig dreht sich das Rad des Seins',
			workTitle: 'Works',
			linkTitle: 'Links',
			work1: 'If Death Were Only the Beginning',
			work2: 'Eggshell Cat APNG Tool',
			work3: 'Code hosted on GitHub',
			work4: 'Eggshell Adventure',
			work5: 'Eggshell Adventure Map Tool',
			work6: 'Eggshell Adventure Level Tool',
			work7: 'Eggshell Cat Emoji',
			work8: 'Eggshell Adventure NPC Image Viewer',
			work9: 'Eggshell Adventure MAIN Video Viewer',
			rolesTitle: 'What I do',
			role1Label: 'Writer',
			role1Note:
				'Long-form fiction, characters and world-building; I like writing complicated things until they are readable. Huh? Can\u2019t make it out? Good\u2014that\u2019s exactly it.',
			role2Label: 'Programmer',
			role2Note:
				'JavaScript, TypeScript, Java, Kotlin, C++, C# \u2014 a little of each, enough to apply on my own and build all sorts of games.',
		},
		ja: {
			title: 'エッグシェルキャット DaiEn — 作家・プログラマー',
			description: 'エッグシェルキャット DaiEn',
			brand: 'エッグシェルキャット',
			brandSub: 'DaiEn',
			roles1: '作家・プログラマー',
			roles2: '書かれて、はじめて存在する',
			lede: '昼はプログラムを書き、夜は小説を書く。どちらも本質は同じこと。見えないリズムを、誰かが感じられる形にすること。',
			sigLabel: '過ぎ去りしすべて、来たるべきすべて\u00a0\u00a0\u00a0\u00a0存在の輪、永遠に回り続ける',
			workTitle: '作品',
			linkTitle: 'リンク',
			work1: 'もし死が始まりにすぎないなら',
			work2: 'エッグシェルキャット APNG ツール',
			work3: 'GitHub でホストするコード',
			work4: 'エッグシェルアドベンチャー',
			work5: 'エッグシェルアドベンチャー Map ツール',
			work6: 'エッグシェルアドベンチャー Level ツール',
			work7: 'エッグシェルキャット Emoji',
			work8: 'エッグシェルアドベンチャー NPC 画像ビューア',
			work9: 'エッグシェルアドベンチャー MAIN 動画ビューア',
			rolesTitle: '私がしていること',
			role1Label: '作家',
			role1Note: '長編小説、人物と世界観の設定。複雑なものを読める形に書くのが好き。ん！？わからない\u2026それでいい！',
			role2Label: 'プログラマー',
			role2Note: 'JavaScript、TypeScript、Java、Kotlin、C++、C# を少しずつかじり、応用程度に。自分でいろいろなゲームをこしらえています。',
		},
	};

	// 這個語言到底有沒有字典；沒有就退回預設，免得整頁變空白
	function pick(lang) {
		return DICT[lang] ? lang : DEFAULT_LANG;
	}

	// 切換鈕無障礙標籤：三隻圖標各自對應一種語言，點哪隻就切哪種
	function ariaLabel() {
		return '選擇語言 / Choose language';
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

		// 切換鈕的無障礙標籤
		var btn = document.getElementById('langBtn');
		if (btn) btn.setAttribute('aria-label', ariaLabel());
	}

	// 目前該用哪個語言：網址上的 ?lang= 優先（給分享連結用），
	// 其次是上次的選擇，都沒有就中文
	function initialLang() {
		var q = (location.search.match(/[?&]lang=([^&]+)/) || [])[1];
		if (q) {
			var v = decodeURIComponent(q).toLowerCase();
			if (v.indexOf('en') === 0) return 'en';
			if (v.indexOf('ja') === 0) return 'ja';
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

	// 直接切到指定語言：套用到整頁並記住選擇
	function setLang(lang) {
		if (!DICT[lang]) return;
		apply(lang);
		save(lang);
	}

	// 委派點擊：從點到的元素往上找最近的 data-lang，決定要切到哪種
	function bindLang(btn) {
		if (!btn) return;
		btn.addEventListener('click', function (e) {
			var el = e.target && e.target.closest ? e.target.closest('[data-lang]') : null;
			if (!el) return;
			setLang(el.getAttribute('data-lang'));
		});
	}

	var first = initialLang();
	apply(first);

	bindLang(document.getElementById('langBtn'));
	bindLang(document.getElementById('footLangBtn'));
})();
