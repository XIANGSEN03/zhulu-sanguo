// 剧情对话：开局、历史事件、三顾茅庐、名将归附时播放。只是演出，不改变任何数值。
// 每段剧情是 S => { bg, place, lines }。
//   bg：背景 night 夜色 / palace 宫阙 / dawn 江天 / forest 林间 / snow 风雪 / spring 隆中春
//   line：{ who: 武将 id（不写就是旁白）, text, choices: [{ text, then: [line…] }] }
//   选项：玩家选了之后，由这一行的 who 把选项原话说出来，接着播 then 里的几行。
// 说话的武将如果已经不在了（阵亡、被俘到别家），那一行自动跳过。
(function (ZL) {
  const rulerOf = (S, f) => S.factions[f] && S.factions[f].alive ? S.factions[f].ruler : null;
  const inFaction = (S, id, f) => S.generals[id] && S.generals[id].alive && S.generals[id].faction === f;

  const SCENES = {
    // ---------- 开局 ----------
    intro_shu: S => ({
      bg: 'night', place: '建安五年 · 春　下邳',
      lines: [
        { text: '袁绍尽起河北之众南下，曹操屯兵官渡。徐州夹在两虎之间，城中灯火彻夜未熄。' },
        { who: 'liubei', text: '二弟、三弟，河北与许都一旦交兵，徐州便是砧上之肉。' },
        { who: 'zhangfei', text: '怕他作甚！哥哥只管下令，俺老张先去把寿春那伙袁术残兵收拾了！' },
        { who: 'guanyu', text: '三弟莫急。寿春无主，取之可连江淮。曹操一年之内无暇南顾，正是我等积蓄之时。' },
        { who: 'liubei', text: '二位贤弟以为，当务之急在何处？', choices: [
          { text: '先取寿春，以图江淮。', then: [{ who: 'zhangfei', text: '好！这才痛快！俺这就去点兵！' }] },
          { text: '先修内政，广纳贤才。', then: [{ who: 'guanyu', text: '兄长仁德，四方之士必闻风而至。' }] },
        ] },
        { who: 'liubei', text: '又闻襄阳隆中有一卧龙……若得此人，何愁大业不成。' },
        { text: '仁德之主，自此起兵。先得十五城者，可定天下。' },
      ],
    }),
    intro_wei: S => ({
      bg: 'palace', place: '建安五年 · 春　许都',
      lines: [
        { text: '袁绍檄文传遍天下，十万之众已屯黎阳。许都宫阙之中，曹操召集群僚。' },
        { who: 'caocao', text: '袁本初兵多而将骄，诸君以为如何？' },
        { who: 'guojia', text: '绍外宽而内忌，任人而疑其心；明公唯才所宜，不问远近。此度胜也。' },
        { who: 'xunyu', text: '公以至弱当至强，若不能制，必为所乘。此天下之大机，不可不慎。' },
        { who: 'caocao', text: '刘备据徐州，孙策窥江东，皆在等我露出破绽。依诸君之见——', choices: [
          { text: '先击刘备，除后顾之忧。', then: [{ who: 'guojia', text: '正合嘉意。刘备新起，众心未附，急击之必破。' }] },
          { text: '全力北拒袁绍。', then: [{ who: 'xunyu', text: '明公神武，奉天子以讨不臣，谁敢不从。' }] },
        ] },
        { who: 'caocao', text: '好。传令诸将，各守其城，听候调遣。' },
        { text: '挟天子以令诸侯。乱世之中，枭雄起于许昌。' },
      ],
    }),
    intro_yuan: S => ({
      bg: 'night', place: '建安五年 · 春　邺城',
      lines: [
        { text: '河北四州之兵云集邺城，旌旗蔽日，营火连绵数十里。' },
        { who: 'yuanshao', text: '吾据四州之地，带甲十万，曹阿瞒岂能当我？' },
        { who: 'tianfeng', text: '主公！曹操善用兵，不可轻举。不如据山河之固，分兵扰之，使彼疲于奔命，不出三年，可坐而克也。' },
        { who: 'jushou', text: '田别驾所言甚是。南下决战，胜负难料；持久之策，方为万全。' },
        { who: 'yuanshao', text: '尔等之意，吾已知晓。', choices: [
          { text: '吾意已决，挥师南下！', then: [
            { who: 'tianfeng', text: '……主公若不听丰言，出师必不利。' },
            { who: 'yuanshao', text: '竖儒安敢乱我军心！退下！' },
          ] },
          { text: '且依二位之言，徐图之。', then: [{ who: 'jushou', text: '主公英明，此河北之幸也。' }] },
        ] },
        { text: '四世三公，坐拥河北。这一次，天命会站在袁氏一边吗？' },
      ],
    }),
    intro_wu: S => ({
      bg: 'dawn', place: '建安五年 · 春　吴郡',
      lines: [
        { text: '晨雾初散，长江之上战船如林。' },
        { who: 'sunce', text: '公瑾！曹袁相持于官渡，许都空虚，正是我等北上之时！' },
        { who: 'zhouyu', text: '伯符莫急。江东初定，人心未附。西有黄祖杀父之仇未报，荆州刘表坐拥沃野。' },
        { who: 'zhouyu', text: '先取江夏，再图荆襄，据长江之险，然后北向，天下可图。' },
        { who: 'sunce', text: '依公瑾之见，下一步——', choices: [
          { text: '先取江夏，报杀父之仇！', then: [{ who: 'zhouyu', text: '好！瑜愿为先锋。' }] },
          { text: '先稳江东，再议进取。', then: [{ who: 'zhouyu', text: '伯符能忍一时，便是江东之福。' }] },
        ] },
        { who: 'sunce', text: '哈哈哈，有公瑾在，何愁天下不定！' },
        { text: '小霸王意气风发。只是谁也不会想到，丹徒的猎场上……' },
      ],
    }),

    // ---------- 历史事件 ----------
    zhaoyun: S => {
      const city = S.cities[S.generals.zhaoyun.city];
      return {
        bg: 'forest', place: `建安五年 · 夏　${city ? city.name : ''}城外`,
        lines: [
          { text: '一骑白马穿林而来，银枪映着林间的日光。' },
          { who: 'zhaoyun', text: '常山赵子龙，特来投奔刘使君！' },
          { who: 'liubei', text: '子龙！公孙瓒处一别，备思之久矣。' },
          { who: 'zhaoyun', text: '云昔日便知使君仁德，可托生死。此身此枪，愿随使君，至死方休。' },
          { who: 'liubei', text: '好！有子龙在，备如添一臂！' },
        ],
      };
    },
    sunce: S => ({
      bg: 'night', place: '建安五年 · 秋　丹徒',
      lines: [
        { text: '孙策出猎丹徒，为许贡门客所伏，箭中面颊。回到府中，伤势已不可救。' },
        { who: 'sunquan', text: '兄长……！' },
        { who: 'sunce', text: '仲谋。举江东之众，决机于两阵之间，与天下争衡，卿不如我；' },
        { who: 'sunce', text: '举贤任能，各尽其心，以保江东，我不如卿。' },
        { who: 'sunce', text: '内事不决问张昭，外事不决问周瑜……好自为之。' },
        { text: '小霸王孙策，卒年二十六。孙权继位，统领江东。' },
      ],
    }),
    yuanshao: S => ({
      bg: 'night', place: '建安七年 · 夏　邺城',
      lines: [
        { text: '袁绍忧愤成疾，呕血而亡。灵堂之上，烛火摇曳。' },
        { who: 'yuanshang', text: '父亲临终，已命我承继大业。' },
        { who: 'yuantan', text: '我是长子！这河北之主，凭什么轮到你？' },
        { who: 'shenpei', text: '二位公子！主公尸骨未寒，岂可在灵前相争！' },
        { text: '兄弟阋墙，河北诸城人心浮动。' },
      ],
    }),
    sunliu: S => {
      const wu = inFaction(S, 'zhouyu', 'wu') ? 'zhouyu' : inFaction(S, 'lusu', 'wu') ? 'lusu' : rulerOf(S, 'wu');
      const shu = inFaction(S, 'zhugeliang', 'shu') ? 'zhugeliang' : rulerOf(S, 'shu');
      const n = Object.values(S.cities).filter(c => c.owner === 'wei').length;
      return {
        bg: 'dawn', place: '长江之上',
        lines: [
          { text: `曹操已据 ${n} 城，兵锋直指江南。一叶扁舟，载着刘备的使者顺江而下。` },
          { who: shu, text: '曹操势大，孙刘两家唇亡齿寒。今日同舟，方能共济。' },
          { who: wu, text: '江东愿与贵方结盟，共拒曹操。约期三年，各守信义。' },
          { text: '孙刘联盟，就此缔结。' },
        ],
      };
    },

    // ---------- 三顾茅庐 ----------
    wolong1: S => ({
      bg: 'spring', place: '襄阳城西二十里　隆中',
      lines: [
        { text: '山不高而秀雅，水不深而澄清。茅庐数间，修竹环绕。' },
        { who: 'liubei', text: '汉左将军、宜城亭侯、领豫州牧刘备，特来拜见先生。' },
        { text: '童子道：“先生今早少出。”问何处去了，答曰：“踪迹不定，不知何处去了。”' },
        { who: 'liubei', text: '……既如此，备改日再来。' },
      ],
    }),
    wolong2: S => ({
      bg: 'snow', place: '隆冬　隆中',
      lines: [
        { text: '朔风凛凛，瑞雪霏霏。刘备冒雪再访隆中。' },
        { who: 'zhangfei', text: '天寒地冻，尚不用兵，岂宜远见无益之人乎！' },
        { who: 'liubei', text: '吾正欲使孔明知我殷勤之意。三弟若怕冷，可先回去。' },
        { text: '草堂之上，先生仍不在。刘备留书一封，怅然而返。' },
      ],
    }),
    wolong3: S => ({
      bg: 'spring', place: '来春　隆中',
      lines: [
        { text: '刘备第三次来到隆中。先生昼寝未起，刘备拱立阶下，候了半晌。' },
        { who: 'zhugeliang', text: '大梦谁先觉？平生我自知。草堂春睡足，窗外日迟迟。' },
        { who: 'liubei', text: '汉室倾颓，奸臣窃命。备欲伸大义于天下，而智术浅短。惟先生开其愚而拯其厄。' },
        { who: 'zhugeliang', text: '北让曹操占天时，南让孙权占地利，将军可占人和。先取荆州为家，后取西川建基业，以成鼎足之势。' },
        { who: 'zhugeliang', text: '将军既不相弃，亮愿效犬马之劳。' },
        { text: '卧龙出山。' },
      ],
    }),
  };

  // 名将归附时说的话（没写的人用通用的）
  const JOIN = {
    zhaoyun: '此身此枪，愿随明公，至死方休。',
    lusu: '肃观天下之势，曹操不可卒除。愿为明公画万全之策。',
    ganning: '锦帆之下八百健儿，从此只听明公号令！',
    huangzhong: '老夫年虽近花甲，尚开得两石之弓。愿随明公征战！',
    machao: '西凉马孟起，愿为明公扫平天下！',
    pangtong: '人皆以貌取人，明公独不然。统愿尽平生所学。',
    xushu: '庶本一介游侠，今愿以胸中所学，报明公知遇。',
    weiyan: '文长愿为先锋，何城不可破！',
    zhangliao: '明公不以降将相待，辽敢不效死！',
    zhanghe: '良禽择木而栖。儁乂愿归明公。',
    taishici: '大丈夫生于乱世，当带三尺剑立不世之功。子义愿随明公！',
    guanyu: '关某有言在先：他日若知兄长下落，必往寻之。在此一日，必尽一日之力。',
  };
  function join(S, g) {
    const ruler = rulerOf(S, S.player);
    const line = JOIN[g.id] || (g.captive ? '败军之将，蒙明公不杀，愿效死力。' : `久闻明公大名，${g.name}愿效犬马之劳。`);
    return {
      bg: g.captive ? 'night' : 'forest', place: `${S.cities[g.city].name}`,
      lines: [
        { text: g.captive ? `${g.name}被押至堂前，解去绳索。` : `${g.name}整衣而出，长揖于前。` },
        { who: g.id, text: line },
        { who: ruler, text: `得${g.name}，如虎添翼！` },
      ],
    };
  }

  ZL.STORY = {
    scene(id, S) { const f = SCENES[id]; return f ? f(S) : null; },
    join,
  };
})(globalThis.ZL = globalThis.ZL || {});
