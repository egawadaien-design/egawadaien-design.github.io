/*
	@author: [DaiEn]
	@Date: 2026-11-14
	@Correction: 2
	本次修正：三頁合併成單一 index.html 之後，這支就只服務那一頁；程式內容完全沒動，
	          只是檔頭說明跟著改（畫布抓的是 #netCanvas，語言切換由 i18n.js 負責，兩者互不相干）
	上次修正：從 index.html 的 inline script 抽成獨立檔，三個語言首頁（index / index-zh / index-en）共用同一支；
	          程式行為完全不變，只是搬家。所有設定（COLOR_MODE / HOLD_SEC / FADE_SEC / OPACITY）都集中在檔頭，
	          改哪一個頁面都會一起生效
*/

/*
 * 粒子網路背景（自製，沒有用 tsParticles 或任何外部函式庫）
 *
 * 長什麼樣：一顆顆小點慢慢漂，彼此靠近就牽一條線，三顆互相連上時中間透出一塊淡淡的白，
 *   像星座、也像一張薄薄的結構網。整片鋪滿視窗、墊在內容後面、不吃滑鼠事件。
 *
 * 為什麼不是黑底：這頁的紙底是蘋果綠（--paper #eef7dd），黑底會把整頁的氣質毀掉；
 *   但點和線本來是深橄欖綠＋淺綠，整片看下去只有一個顏色。現在改成點與線都吃「彩虹盤」：
 *   洋紅、粉、橙、金、萊姆、青綠、天藍、藍、紫共 9 色，每顆粒子隨機抽一個（順序是亂的、
 *   不是照位置排），線段則在兩端各取自己那顆粒子的顏色拉漸層，所以一顆點跨到隔壁點時
 *   中間會自然過渡。三角形面紗則是跟頂點借色相、濃度壓得很低（用純白會把底下的彩色線洗成灰白，
 *   這一點是實測截圖才看出來的）。
 *
 * 顏色怎麼給：兩種玩法，用最上面的 COLOR_MODE 數字切換（刻意藏在 JS 裡、頁面不放選單）。
 *   0＝多色同時：9 色各自分給粒子，顏色固定不變。
 *   1～4＝幾色一組：同一時間畫面上只有 N 色（N 分別是 4／3／2／1），先停 HOLD_SEC 秒，
 *     再用 FADE_SEC 秒把每一色「沿最短的色相路徑」慢慢推往下一組隨機挑的顏色；
 *     全體粒子同時過渡，所以看起來是整片換色，而不是一顆一顆跳。
 *   點的色相、線段的兩端漸層、三角形面紗都吃同一套色相值，所以換色時三者一起走。
 *
 * 粒子怎麼動：每顆走一條利薩如軌跡（x 用 sin、y 用 cos），兩個軸的頻率與相位都由固定種子決定，
 *   所以每次重新整理都是同一片網路（不會每次載入都換一張臉）。
 *   這裡不需要「接格」，因此頻率不必取整數，只要動作慢、看起來像在呼吸就好。
 *
 * 每格只做三件事：算位置 → 算距離（近的連線、三點連成三角形，先填面再畫線）→ 畫點。
 */
(function () {
	var cv = document.getElementById('netCanvas');
	if (!cv || !cv.getContext) return;
	var ctx = cv.getContext('2d');
	var dpr = Math.min(2, window.devicePixelRatio || 1);
	var TAU = Math.PI * 2;

	// 九色鮮艷彩虹盤（色相）：洋紅 305 → 粉 352 → 橙 14 → 金 42 → 萊姆 96 →
	//   青綠 172 → 天藍 196 → 藍 228 → 紫 268。每顆粒子從這裡「隨機」抽一個，
	//   所以顏色在畫面上是跳著的，不是左到右排一排
	var PALETTE = [305, 352, 14, 42, 96, 172, 196, 228, 268];

	/*	===== 【設定】改這裡就好，頁面上沒有選單 =====
	 *	COLOR_MODE 決定「一次出現幾種顏色」：
	 *	0 = 多色同時（9 色全部上場，每顆粒子固定一個顏色，永遠不換）
	 *	1 = 四色一起出現，停 HOLD_SEC 秒後慢慢漸變成「另外四色」（顏色每輪隨機挑）
	 *	2 = 三色一起出現，停 HOLD_SEC 秒後慢慢漸變成「另外三色」
	 *	3 = 雙色一起出現，停 HOLD_SEC 秒後慢慢漸變成「另外雙色」
	 *	4 = 單色出現，停 HOLD_SEC 秒後慢慢漸變成「另一色」
	 *	填別的數字／亂填 = 當成 0 處理。
	 *	換色節奏：HOLD_SEC 秒停住不動，再用 FADE_SEC 秒過渡完，然後換下一組，無限循環。 */
	var COLOR_MODE = 3;
	var HOLD_SEC = 20; // 一組顏色停留幾秒
	var FADE_SEC = 8; // 過渡到下一個顏色組合要幾秒（越長越像「慢慢化過去」）

	// 模式 → 一組幾色（0 代表不限制＝9 色全上）
	var GROUP_N = [0, 4, 3, 2, 1][COLOR_MODE] || 0;

	// 同一組裡的顏色至少要差幾度：隨機挑到「金 42°＋萊姆 96°」這種相鄰色時，
	// 整片看起來會像同一個顏色，所以挑色時要求兩兩至少差 55°（湊不滿才放寬）
	var MIN_SEP = 55;

	/* 整片網路要多濃：0~255，0 最清楚（點是實心的）、255 就整片消失。
	 * 注意方向跟 CSS 的 alpha 相反——這裡填的是「透明度」不是「不透明度」，
	 * 所以數字愈大愈淡；要淡一半填 128。
	 * 倍率同時套在點、線段、三角形面紗三個地方，一起濃淡才不會出現「只剩線在飄」。 */
	var OPACITY = 200;

	var w = 0,
		h = 0,
		link = 0;
	var P = []; // 每顆粒子的固定資料（座標都用 0~1 正規化）
	var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	// 固定種子的亂數（LCG）：同一顆種子永遠長出同一片網路
	function seedRnd(seed) {
		var s = seed % 2147483647;
		if (s <= 0) s += 2147483646;
		return function () {
			s = (s * 16807) % 2147483647;
			return (s - 1) / 2147483646;
		};
	}

	// 「第 k 輪要用哪幾色」：把調色盤洗牌取前 N 個，並且先把「上一輪用過的颜色」剔掉，
	//   這樣每一輪拿到的都是真正的「另外幾色」，不會有某個色原地不動、看起來像沒換。
	//   9 色扣掉上一輪的 N 色後還有 9-N 個，而 N 最大 4，所以永遠夠挑。
	//   結果順手快取起來：每輪只算一次，之後每格直接查表，不會因為時間跑久就越算越慢。
	var groupCache = [];
	function groupAt(k) {
		if (groupCache[k]) return groupCache[k];
		var prev = k > 0 ? groupAt(k - 1) : []; // 只往回追一層，其餘都已經在快取裡
		var r = seedRnd(k * 104729 + GROUP_N * 13 + 7); // 用輪次當種子：同一輪每次算都同一組色
		var pool = PALETTE.filter(function (h) {
			return prev.indexOf(h) < 0;
		});
		for (var i = pool.length - 1; i > 0; i--) {
			// Fisher-Yates 洗牌
			var j = Math.floor(r() * (i + 1));
			var tmp = pool[i];
			pool[i] = pool[j];
			pool[j] = tmp;
		}
		groupCache[k] = pickSpread(pool); // 洗牌後再挑「彼此差得夠遠」的幾色
		return groupCache[k];
	}

	// 從洗好的池子裡挑 N 個色相，兩兩至少差 MIN_SEP 度（用圓環距離算，環頭環尾不會誤判成很遠）
	function pickSpread(pool) {
		var chosen = [];
		for (var i = 0; i < pool.length && chosen.length < GROUP_N; i++) {
			var h = pool[i],
				ok = true;
			for (var q = 0; q < chosen.length; q++) {
				if (Math.abs(((h - chosen[q] + 540) % 360) - 180) < MIN_SEP) {
					ok = false;
					break;
				}
			}
			if (ok) chosen.push(h);
		}
		// 門檻太嚴湊不滿時就放寬：直接補上還沒挑到的名額（寧可相近，也不要少一個色）
		for (var p = 0; p < pool.length && chosen.length < GROUP_N; p++) {
			if (chosen.indexOf(pool[p]) < 0) chosen.push(pool[p]);
		}
		return chosen;
	}

	// 色相內插：走「最短的那一圈」。350° → 14° 應該是 +24°，不是倒著繞 336°，
	//   不然換色時整片會突然歪去別的顏色再繞回來
	function lerpHue(a, b, m) {
		var d = ((b - a + 540) % 360) - 180; // -180 ~ +180 之間的最短差距
		return (a + d * m + 360) % 360;
	}

	// 建立粒子：數量跟著畫面面積走，小螢幕不擠、大螢幕不稀
	function build() {
		var count = Math.max(40, Math.min(110, Math.round((w * h) / 16000)));
		P.length = 0;
		for (var i = 0; i < count; i++) {
			var g = seedRnd(i * 7919 + 17); // 每顆自己的種子：改數量時只會多／少尾巴那幾顆
			P.push({
				nx: 0.06 + 0.88 * g(), // 軌跡中心（0~1）
				ny: 0.08 + 0.84 * g(),
				ax: 0.03 + 0.1 * g(), // 左右擺幅（0~1）
				ay: 0.03 + 0.1 * g(), // 上下擺幅
				fx: 0.01 + 0.03 * g(), // 每秒繞幾圈（慢，才像呼吸）
				fy: 0.01 + 0.03 * g(),
				ox: g(),
				oy: g(), // 相位
				r: 1.1 + 1.5 * g(), // 半徑
				a: 0.55 + 0.45 * g(), // 這顆多濃（0.55~1.0；點只有 1~2.6px，太淡就只剩一個灰點）
				// 【顏色】從彩虹盤隨機抽一個色相，再抖 ±4° 免得同色號的粒子一模一樣；
				//   用同一顆固定種子，所以重整後顏色位置不會跳，但順序本來就是亂的
				hue: PALETTE[Math.floor(g() * PALETTE.length)] + (g() * 8 - 4),
				// 分組模式（COLOR_MODE 1~4）專用的抖動值：同一組色的粒子之間也要有一點差別，
				//   不然整片會像同一個色塊塗上去
				jit: g() * 8 - 4,
			});
		}
		link = Math.min(w, h) * 0.15; // 連線距離：短邊的 15%
	}

	function resize() {
		w = window.innerWidth;
		h = window.innerHeight;
		cv.width = Math.round(w * dpr);
		cv.height = Math.round(h * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // 之後都用 CSS 像素座標作畫
		build();
	}

	function draw(t) {
		ctx.clearRect(0, 0, w, h); // 只清畫布，底色是 body 的蘋果綠，不鋪黑

		// 【透明度】把 OPACITY（0~255）翻成倍率：0 → 1 倍（原本的濃度）、255 → 0（什麼都不畫）
		var fade = 1 - Math.min(255, Math.max(0, OPACITY)) / 255;
		if (fade <= 0.004) return; // 已經全透明，連位置都省得算

		// 1. 算這一刻所有粒子的位置
		var px = [],
			py = [],
			pr = [],
			pa = [],
			ph = [];
		for (var i = 0; i < P.length; i++) {
			var p = P[i];
			px.push((p.nx + p.ax * Math.sin(TAU * (p.fx * t + p.ox))) * w);
			py.push((p.ny + p.ay * Math.cos(TAU * (p.fy * t + p.oy))) * h);
			pr.push(p.r);
			pa.push(p.a);
		}

		// 1.5 這一刻每顆粒子要用什麼色相
		if (!GROUP_N) {
			// 模式 0：建粒子時就抽好色，直接沿用（9 色各據一方、不換色）
			for (var i0 = 0; i0 < P.length; i0++) ph.push(P[i0].hue);
		} else {
			// 模式 1~4：整批照「這一輪的 N 色 → 下一輪的 N 色」過渡
			var cycle = HOLD_SEC + FADE_SEC;
			var kNow = Math.floor(t / cycle); // 現在是第幾輪
			var inCycle = t - kNow * cycle; // 這一輪走到第幾秒
			var mix = inCycle <= HOLD_SEC ? 0 : (inCycle - HOLD_SEC) / FADE_SEC;
			// 緩入緩出（smoothstep）：換色開頭與結尾都慢，中段才走比較快，看起來像呼吸
			mix = mix * mix * (3 - 2 * mix);
			var from = groupAt(kNow),
				to = groupAt(kNow + 1);
			for (var i1 = 0; i1 < P.length; i1++) {
				var slot = i1 % GROUP_N; // 輪流分派：一組 N 色就平均分 N 份
				ph.push(lerpHue(from[slot], to[slot], mix) + P[i1].jit);
			}
		}

		// 2. 鄰居清單：距離小於 link 的算一組（三角形要找「共同鄰居」，先建表才不會 O(n³)）
		var nb = [];
		for (var a = 0; a < px.length; a++) {
			var set = [];
			for (var b = 0; b < px.length; b++) {
				if (a === b) continue;
				var dx = px[a] - px[b],
					dy = py[a] - py[b];
				if (dx * dx + dy * dy <= link * link) set.push(b);
			}
			nb.push(set);
		}

		// 3. 先鋪三角形的面紗：三顆彼此都在 link 內就填一塊半透明的色面
		//    用白色會把底下的彩色線整片洗成灰白（實測截圖看過），所以改成跟頂點同色系、
		//    濃度壓到 0.12，看起來像一片彩色霧玻璃而不是白斑
		var triUsed = 0;
		for (var i2 = 0; i2 < nb.length; i2++) {
			var triHue = ph[i2].toFixed(0);
			var na = nb[i2];
			for (var x = 0; x < na.length; x++) {
				var bb = na[x];
				if (bb <= i2 || triUsed >= 400) continue; // 每組只畫一次；上限 400 片護住效能
				var nbb = nb[bb];
				for (var y = 0; y < na.length; y++) {
					var cc = na[y];
					if (cc <= bb || triUsed >= 400) continue;
					if (nbb.indexOf(cc) < 0) continue; // 第三點要同時是兩邊的鄰居
					ctx.fillStyle = 'hsla(' + triHue + ',85%,58%,' + (0.08 * fade).toFixed(3) + ')';
					ctx.beginPath();
					ctx.moveTo(px[i2], py[i2]);
					ctx.lineTo(px[bb], py[bb]);
					ctx.lineTo(px[cc], py[cc]);
					ctx.closePath();
					ctx.fill();
					triUsed++;
				}
			}
		}

		// 4. 連線：越近越清楚，剛好碰到 link 時完全消失
		ctx.lineWidth = 1;
		for (var a2 = 0; a2 < px.length; a2++) {
			var na2 = nb[a2];
			for (var k = 0; k < na2.length; k++) {
				var b2 = na2[k];
				if (b2 <= a2) continue;
				var dx2 = px[a2] - px[b2],
					dy2 = py[a2] - py[b2];
				var d = Math.sqrt(dx2 * dx2 + dy2 * dy2);
				var al = (1 - d / link) * 0.55 * fade; // 最深 0.55：線也要看得出顏色，不然整片只剩點在跳
				if (al < 0.01) continue;
				// 【線段漸變】兩端各用自己那顆粒子的色相，中間就是一段漸層：
				//   一顆洋紅接一顆青綠的線，會在中間慢慢變過去，整片網路才像「彩虹網」而不是單色網。
				//   兩端同色號（機率很低）就退回純色，省一個 gradient 物件
				var ha = ph[a2],
					hb = ph[b2];
				if (Math.abs(ha - hb) > 6) {
					var grd = ctx.createLinearGradient(px[a2], py[a2], px[b2], py[b2]);
					grd.addColorStop(0, 'hsla(' + ha.toFixed(0) + ',95%,42%,' + al.toFixed(3) + ')');
					grd.addColorStop(1, 'hsla(' + hb.toFixed(0) + ',95%,42%,' + al.toFixed(3) + ')');
					ctx.strokeStyle = grd;
				} else {
					ctx.strokeStyle = 'hsla(' + ha.toFixed(0) + ',95%,42%,' + al.toFixed(3) + ')';
				}
				ctx.beginPath();
				ctx.moveTo(px[a2], py[a2]);
				ctx.lineTo(px[b2], py[b2]);
				ctx.stroke();
			}
		}

		// 5. 點：外圈一層很淡的光暈、內圈一顆實心點（淺底上要有「微微發亮」只能靠這兩層）
		//    兩層都吃這顆抽到的色相：外圈亮一點（55%）、內圈深一點（45%），顏色才不會糊在紙底上
		for (var n = 0; n < px.length; n++) {
			var hueN = ph[n].toFixed(0);
			ctx.fillStyle = 'hsla(' + hueN + ',95%,58%,' + (pa[n] * 0.3 * fade).toFixed(3) + ')';
			ctx.beginPath();
			ctx.arc(px[n], py[n], pr[n] * 2.6, 0, TAU);
			ctx.fill();
			ctx.fillStyle = 'hsla(' + hueN + ',95%,42%,' + (pa[n] * fade).toFixed(3) + ')';
			ctx.beginPath();
			ctx.arc(px[n], py[n], pr[n], 0, TAU);
			ctx.fill();
		}
	}

	var last = 0,
		clock = 0;
	function loop(now) {
		if (!last) last = now;
		var dt = Math.min(0.05, (now - last) / 1000); // 夾住 dt：切回分頁時不會一次跳一大格
		last = now;
		clock += dt;
		draw(clock);
		requestAnimationFrame(loop);
	}

	window.addEventListener('resize', function () {
		resize();
		if (reduced) draw(0.8); // 靜態模式：縮放後補畫一格，不然畫面會是舊尺寸的殘影
	});

	resize();
	if (reduced) {
		draw(0.8); // 不喜歡動態的人：固定一個好看的一格
	} else {
		requestAnimationFrame(loop);
	}
})();
