import type { Scenario } from './types';

// ===== 刘备开局 · 测试聚落池（共 5 个，全归玩家掌控）=====
// 层级：范阳郡(大区) → 涿县(主城) → 〔乡/亭〕 → 里(村落，最小单位)
// 英雄村 2：大树楼桑里(刘备出生)、桃庄(张飞故里)
// 普通村 3：西陌里、东陂里、南冈里（无剧情，仅基础资源）
export const liubeiRealm: Scenario = {
  name: '刘备起兵 · 楼桑里',
  playerStart: 'dashu',
  realm: { jun: '范阳郡', xian: '涿县' },
  opening:
    '汉灵帝光和年间，涿郡涿县大树楼桑里。\n\n' +
    '刘备，字玄德，汉室宗亲之后。少孤，与母贩履织席为业——宅东南有桑树高五丈余，遥望如小车盖，时人异之。年十五，母使行学，事大儒卢植，与公孙瓒同窗；及长，少言而善下人，喜怒不形于色，好交结豪侠，年少争附之。\n\n' +
    '中山大商张世平、苏双赀累千金，贩马周旋于涿郡，见而异之，乃多与之金财。先主由是得用合徒众。\n\n' +
    '今黄巾将起，天下扰攘。汝当自村落起兵，聚族屯粮、结纳豪杰，待乱世建功，终成一方诸侯。\n\n—— 史实据《三国志·蜀书·先主传》',
  startReputation: 15, // 刘备天生善下人、招募加成
  startTitle: '白身（布衣）',
  factions: [{ id: 'player', name: '刘备势力', color: '#3b82f6', isAI: false }],
  heroes: [
    {
      id: 'liubei',
      name: '刘备',
      title: '汉室宗亲 · 义军首领',
      emoji: '🐉',
      boundVillage: 'dashu',
      bond: '与大树楼桑里宗族同源，族人愿效死力',
      bonus: '楼桑里宗族人力 +30%，征召务农额外 +人口',
      unlocked: true,
      stats: { lead: 72, war: 62, int: 75, pol: 70, cha: 96 },
      hometown:
        '大树楼桑里。少孤，与母贩履织席为业——宅东南有桑树高五丈余，遥望如小车盖，乡里异之，号「楼桑」。' +
        '年十五，母使行学，事大儒卢植，与辽西公孙瓒俱为同窗。及长，少语言，善下人，喜怒不形于色，好交结豪侠，年少争附之。',
      clan: [
        { kind: 'npc', id: 'liuhong' },
        { kind: 'npc', id: 'liumu' },
        { kind: 'npc', id: 'liuderan' },
        { kind: 'npc', id: 'luzhi' },
        { kind: 'npc', id: 'gongsunzan' },
        { kind: 'npc', id: 'zhangshiping' },
        { kind: 'npc', id: 'sushuang' },
        { kind: 'hero', id: 'zhangfei' },
      ],
      biography:
        '刘备，字玄德，汉景帝子中山靖王刘胜之后。性宽厚，善得人心，起于布衣而终成一方诸侯。',
    },
    {
      id: 'zhangfei',
      name: '张飞',
      title: '桃庄猛士',
      emoji: '🐯',
      boundVillage: 'taozhuang',
      bond: '桃庄故里，一身是胆',
      bonus: '桃庄畜牧肉食 +30%，乡勇征召更高效',
      unlocked: false,
      stats: { lead: 81, war: 98, int: 40, pol: 30, cha: 55 },
      hometown:
        '桃庄。涿郡豪勇之士，桃林环绕，宜畜牧。性烈而重义，万人敌也。',
      clan: [
        { kind: 'hero', id: 'liubei' },
        { kind: 'npc', id: 'guanyu' },
      ],
      biography:
        '张飞，字益德，涿郡人。勇冠三军，嫉恶如仇；惜鞭挞健儿而无恩，终为部将所害。',
    },
  ],
  // ===== NPC 角色（刘备相关地点与待开发角色，集中定义，关系网络统一引用）=====
  npcs: [
    { id: 'liuhong', name: '刘弘', relation: '父亲', note: '早逝（少孤）', boundVillage: 'dashu', status: 'developed' },
    { id: 'liumu', name: '刘母', relation: '母亲', note: '织席贩履，咬牙供其求学', boundVillage: 'dashu', status: 'developed' },
    { id: 'liuderan', name: '刘德然', relation: '同宗', note: '同郡，共事卢植', boundVillage: 'dashu', status: 'developed' },
    { id: 'luzhi', name: '卢植', relation: '恩师', note: '大儒，九江太守', region: '九江', status: 'to_develop' },
    { id: 'gongsunzan', name: '公孙瓒', relation: '同窗·挚友', note: '辽西人，同师卢植', region: '辽西', status: 'to_develop' },
    { id: 'zhangshiping', name: '张世平', relation: '资助者', note: '中山大商，赠金财合徒众', region: '中山', status: 'to_develop' },
    { id: 'sushuang', name: '苏双', relation: '资助者', note: '中山大商，贩马周旋涿郡', region: '中山', status: 'to_develop' },
    { id: 'guanyu', name: '关羽', relation: '义兄', note: '后桃园结义，同生同死', region: '涿郡', status: 'to_develop' },
  ],
  villages: [
    {
      id: 'dashu',
      name: '大树楼桑里',
      tier: 'li',
      level: 1,
      position: [210, 300],
      terrain: 'plain',
      elevation: 0,
      owner: 'player',
      population: 40,
      minxin: 62,
      tax: 35,
      chief: true,
      militia: 0,
      buildings: [],
      yields: { food: 0, production: 0, gold: 0 },
      heroVillage: 'liubei',
      specialty: 'weave',
      explored: true,
      desc: '刘备出生地，桑树成林。宗族聚居，人力充沛。特产：织席贩履（草鞋·草席）。',
    },
    {
      id: 'taozhuang',
      name: '桃庄',
      tier: 'li',
      level: 1,
      position: [400, 210],
      terrain: 'plain',
      elevation: 0,
      owner: 'player',
      population: 34,
      minxin: 58,
      tax: 35,
      chief: false,
      militia: 0,
      buildings: [],
      yields: { food: 0, production: 0, gold: 0 },
      heroVillage: 'zhangfei',
      specialty: 'livestock',
      explored: true,
      desc: '张飞故里，桃林环绕，宜畜牧。特产：畜牧肉食；可于此招揽张飞。',
    },
    {
      id: 'ximo',
      name: '西陌里',
      tier: 'li',
      level: 1,
      position: [120, 470],
      terrain: 'plain',
      elevation: 0,
      owner: 'player',
      population: 26,
      minxin: 55,
      tax: 35,
      chief: false,
      militia: 0,
      buildings: [],
      yields: { food: 0, production: 0, gold: 0 },
      explored: true,
      desc: '普通村落，田畴平整，只供基础粮产。',
    },
    {
      id: 'dongpi',
      name: '东陂里',
      tier: 'li',
      level: 1,
      position: [350, 480],
      terrain: 'river',
      elevation: 0,
      owner: 'player',
      population: 24,
      minxin: 53,
      tax: 35,
      chief: false,
      militia: 0,
      buildings: [],
      yields: { food: 0, production: 0, gold: 0 },
      explored: true,
      desc: '普通村落，临水陂塘，渔粮兼收。',
    },
    {
      id: 'nangang',
      name: '南冈里',
      tier: 'li',
      level: 1,
      position: [540, 430],
      terrain: 'hill',
      elevation: 1,
      owner: 'player',
      population: 22,
      minxin: 52,
      tax: 35,
      chief: false,
      militia: 0,
      buildings: [],
      yields: { food: 0, production: 0, gold: 0 },
      explored: true,
      desc: '普通村落，地势微高，宜守难攻。',
    },
  ],
  routes: [
    { from: 'dashu', to: 'taozhuang', type: 'road', movementCost: 1 },
    { from: 'dashu', to: 'ximo', type: 'road', movementCost: 1 },
    { from: 'dashu', to: 'dongpi', type: 'road', movementCost: 1 },
    { from: 'taozhuang', to: 'nangang', type: 'road', movementCost: 1 },
    { from: 'dongpi', to: 'nangang', type: 'road', movementCost: 1 },
  ],
  // ===== 主线剧情任务链（据《三国志·先主传》四阶段拆解）=====
  quests: [
    {
      id: 'q_rooted',
      chapter: '一、寒门立身',
      title: '织席贩履·积业',
      era: '光和六年',
      trigger: { type: 'start' },
      complete: { type: 'flag', key: 'rooted' },
      desc: '先主少孤，与母贩履织席为业。宅边巨桑，童童如盖，乡里异之。布衣之身，唯勤苦营生耳。',
      objective: '于大树楼桑里「织席贩履」「砍柴」积攒铜钱（≥25），以待乡老举荐为里长。',
      effects: [
        { kind: 'reputation', value: 3 },
        { kind: 'flag', key: 'rooted' },
      ],
    },
    {
      id: 'q_settle',
      chapter: '二、里中立足',
      title: '兴筑家园',
      era: '光和六年',
      trigger: { type: 'flag', key: 'rooted' },
      complete: { type: 'villageHas', id: 'dashu', buildings: ['farm', 'well'] },
      desc: '既为里长，当安顿一里民政：垦田凿井，使族人有所依。',
      objective: '于大树楼桑里兴建「农田」「水井」（里长可营建）。',
      effects: [
        { kind: 'reputation', value: 4 },
        { kind: 'flag', key: 'settled' },
      ],
    },
    {
      id: 'q_merchant',
      chapter: '三、青年蓄力',
      title: '富商资助',
      era: '光和六年',
      trigger: { type: 'flag', key: 'settled' },
      complete: { type: 'manual' },
      desc: '中山大商张世平、苏双赀累千金，贩马周旋于涿郡，见先主而异之，乃多与之金财。先主由是得用合徒众。',
      objective: '承接富商资助，以重金招募乡勇、拉拢本地人才。',
      effects: [
        { kind: 'resource', gold: 60 },
        { kind: 'reputation', value: 5 },
        { kind: 'flag', key: 'funded' },
      ],
    },
    {
      id: 'q_zhangfei',
      chapter: '三、青年蓄力',
      title: '桃庄结义·招张飞',
      era: '光和六年',
      trigger: { type: 'flag', key: 'funded' },
      complete: { type: 'heroUnlocked', heroId: 'zhangfei' },
      desc: '桃庄猛士张飞，一身是胆。先主往结，得其死力，遂有起兵之本。',
      objective: '前往桃庄，招揽英雄张飞。',
      effects: [
        { kind: 'reputation', value: 5 },
        { kind: 'flag', key: 'zhangfei_joined' },
      ],
    },
    {
      id: 'q_yellow_turban',
      chapter: '四、正式登场',
      title: '黄巾之乱',
      era: '中平元年（184）',
      trigger: { type: 'date', ad: 184 },
      complete: { type: 'manual' },
      desc: '中平元年，张角倡乱，天下响应，州郡失据。朝廷募兵，简选将帅。乱世之幕，于此拉开。',
      objective: '承接讨贼之命，整备乡勇，待时而动。',
      effects: [
        { kind: 'flag', key: 'yellow_turban_war' },
        { kind: 'reputation', value: 5 },
      ],
    },
    {
      id: 'q_first_post',
      chapter: '四、正式登场',
      title: '功授县尉',
      era: '中平元年（184）',
      trigger: { type: 'flag', key: 'yellow_turban_war' },
      complete: { type: 'villageHas', id: 'dashu', level: 3 },
      desc: '先主率乡勇从校尉邹靖讨黄巾，有功。朝廷论功，授安喜县尉——布衣跃为基层官吏，肇基于此。',
      objective: '将大树楼桑里提升至 Lv3，练兵积粮，以应朝廷征辟。',
      effects: [
        { kind: 'title', value: '安喜县尉' },
        { kind: 'reputation', value: 10 },
        { kind: 'flag', key: 'official' },
      ],
    },
  ],
  // ===== 树状奇遇（主线「非线性树状奇遇」）：织席贩履起步，多分支收敛 =====
  // 设计：从根节点 a_root 进入，玩家在「勤苦营生 / 结交豪侠 / 负笈求学」三条路间择一，
  // 每条路再分两枝，最终收敛到叶子（无 next → done）。成效全在数据中，UI 不写死。
  adventures: [
    {
      id: 'adv_liubei_root',
      chapter: '一、寒门立身',
      title: '织席贩履',
      rootId: 'a_root',
      trigger: { type: 'start' },
      nodes: [
        {
          id: 'a_root',
          era: '光和六年',
          situation:
            '先主少孤，与母贩履织席为业。宅东南有桑树高五丈余，遥望如小车盖，乡里异之，号「楼桑」。' +
            '家贫而志不短——此身当如何立世？',
          choices: [
            {
              id: 'c_diligent',
              label: '勤苦营生 · 织席贩履',
              desc: '起早贪黑，草鞋草席远销乡里，积攒些许本钱。',
              effects: [
                { kind: 'resource', food: 5, gold: 3 },
                { kind: 'flag', key: 'weave_diligent' },
              ],
              next: 'a_market',
            },
            {
              id: 'c_befriend',
              label: '好交结豪侠',
              desc: '少言而善下人，喜怒不形于色，年少争附之。',
              effects: [
                { kind: 'reputation', value: 4 },
                { kind: 'flag', key: 'befriend' },
              ],
              next: 'a_hero',
            },
            {
              id: 'c_study',
              label: '负笈求学 · 卢植',
              desc: '年十五，母使行学，事大儒卢植，与公孙瓒同窗。',
              require: { reputation: 10 },
              effects: [
                { kind: 'reputation', value: 3 },
                { kind: 'flag', key: 'study' },
              ],
              next: 'a_study',
            },
          ],
        },
        {
          id: 'a_market',
          era: '光和六年',
          situation: '草鞋草席小有名气，市集之上，如何处置这第一桶财货？',
          choices: [
            {
              id: 'c_zhongshan',
              label: '远贩中山',
              desc: '闻中山大商往来涿郡，或可借路贩履，获利更丰。',
              effects: [
                { kind: 'resource', gold: 10 },
                { kind: 'flag', key: 'merchant_route' },
              ],
            },
            {
              id: 'c_hoard',
              label: '囤粮备荒',
              desc: '乱世将至，宁可少赚，也要储粮以安宗族。',
              effects: [
                { kind: 'resource', food: 15 },
                { kind: 'flag', key: 'hoard' },
              ],
            },
          ],
        },
        {
          id: 'a_hero',
          era: '光和六年',
          situation: '豪侠闻风来附，皆愿效死力。如何待之？',
          choices: [
            {
              id: 'c_accept',
              label: '倾心接纳义士',
              desc: '散财结客，宗族之外更得乡里壮士相助。',
              effects: [
                { kind: 'population', villageId: 'dashu', value: 5 },
                { kind: 'flag', key: 'yi_shi' },
              ],
            },
            {
              id: 'c_decline',
              label: '婉拒避祸',
              desc: '羽翼未丰，暂敛锋芒，厚结人心而不轻举。',
              effects: [
                { kind: 'reputation', value: 2 },
                { kind: 'flag', key: 'declined' },
              ],
            },
          ],
        },
        {
          id: 'a_study',
          era: '光和六年',
          situation: '卢植门下，同窗甚众。这段学旅，当取何所得？',
          choices: [
            {
              id: 'c_classics',
              label: '苦读经史',
              desc: '沉潜典籍，涵养胸襟，声名渐起于士林。',
              effects: [
                { kind: 'reputation', value: 5 },
                { kind: 'flag', key: 'learned' },
              ],
            },
            {
              id: 'c_classmate',
              label: '结交同窗公孙瓒',
              desc: '辽西公孙瓒，同师卢植，性骁勇，可深交以为缓急之援。',
              effects: [
                { kind: 'flag', key: 'gongsun' },
                { kind: 'reputation', value: 3 },
              ],
            },
          ],
        },
      ],
    },
  ],
  // ===== 动态事件 / 危机池（让游戏有张力：流寇、天灾、告急、机遇、里中细故）=====
  events: [
    {
      id: 'ev_petty',
      title: '里中细故',
      emoji: '🏘️',
      situation:
        '楼桑里二邻因田界相争，几欲斗殴；又有孤老无依，乞一饭之施。乡里细故，亦关民心。',
      trigger: { type: 'everyTurn', chance: 0.2 },
      choices: [
        {
          id: 'c_judge',
          label: '秉公调停',
          desc: '耗金 2，民心 +4。',
          cost: { gold: 2 },
          effects: [{ kind: 'minxin', villageId: 'dashu', value: 4 }],
          resultText: '⚖️ 公断田界，乡里悦服，争讼渐息。',
        },
        {
          id: 'c_ignore',
          label: '置之不理',
          desc: '民心 -3。',
          effects: [{ kind: 'minxin', villageId: 'dashu', value: -3 }],
          resultText: '😑 细故累积，人心渐离，非长久之计。',
        },
      ],
    },
    {
      id: 'ev_turban_raid',
      title: '黄巾流寇袭扰',
      emoji: '🔥',
      situation:
        '中平元年，黄巾残部流窜涿县，一伙流贼窥伺大树楼桑里，欲劫掠粮秣、裹挟族人。' +
        '村中仅有乡勇若干，如何应之？',
      trigger: { type: 'flag', key: 'yellow_turban_war' },
      choices: [
        {
          id: 'c_resist',
          label: '募乡勇抵御',
          desc: '倾村力战，护佑宗族。耗粮 5、金 3，乡勇 +5，民心 +3。',
          cost: { food: 5, gold: 3 },
          effects: [
            { kind: 'militia', villageId: 'dashu', value: 5 },
            { kind: 'minxin', villageId: 'dashu', value: 3 },
          ],
          resultText: '🔥 乡勇奋起，贼众不敢近，楼桑里赖以粗安。',
        },
        {
          id: 'c_bribe',
          label: '纳粮求和',
          desc: '赂贼以安，耗粮 10，声望 -3，民心 +2。',
          cost: { food: 10 },
          effects: [
            { kind: 'reputation', value: -3 },
            { kind: 'minxin', villageId: 'dashu', value: 2 },
          ],
          resultText: '🤝 以粮赂贼，村墟暂保，然乡里颇有耻之。',
        },
        {
          id: 'c_flee',
          label: '举族避祸',
          desc: '暂弃村墟，避其锋芒。民心 -10，人口 -5。',
          effects: [
            { kind: 'minxin', villageId: 'dashu', value: -10 },
            { kind: 'population', villageId: 'dashu', value: -5 },
          ],
          resultText: '🏃 举族暂避，楼桑里为空村，待乱定再归。',
        },
      ],
    },
    {
      id: 'ev_drought',
      title: '蝗旱之灾',
      emoji: '🥵',
      situation: '涿郡大旱，蝗虫蔽天，田稼将尽。村中存粮有限，如何度荒？',
      trigger: { type: 'everyTurn', chance: 0.14 },
      choices: [
        {
          id: 'c_relief',
          label: '开仓赈灾',
          desc: '散粮济民，耗粮 12，民心 +8。',
          cost: { food: 12 },
          effects: [{ kind: 'minxin', villageId: 'dashu', value: 8 }],
          resultText: '🌾 开仓赈济，乡民感念，民心大安。',
        },
        {
          id: 'c_endure',
          label: '听天由命',
          desc: '闭仓自保，民心 -6。',
          effects: [{ kind: 'minxin', villageId: 'dashu', value: -6 }],
          resultText: '😞 坐视田稼尽毁，民心浮动，流言四起。',
        },
      ],
    },
    {
      id: 'ev_neighbor_help',
      title: '邻村告急',
      emoji: '🆘',
      situation: '西陌里遭流民劫掠，里正遣人星夜来求援：「贼众将至，乞发兵相救！」',
      trigger: { type: 'flag', key: 'rooted' },
      choices: [
        {
          id: 'c_aid',
          label: '出兵相助',
          desc: '抽乡勇往援，耗乡勇 3（楼桑里），声望 +4，西陌里民心 +6。',
          require: { flag: 'rooted' },
          effects: [
            { kind: 'militia', villageId: 'dashu', value: -3 },
            { kind: 'reputation', value: 4 },
            { kind: 'minxin', villageId: 'ximo', value: 6 },
          ],
          resultText: '🛡️ 乡勇驰援，西陌里转危为安，涿县皆称义名。',
        },
        {
          id: 'c_stand',
          label: '闭门自守',
          desc: '保境安民，声望 -3。',
          effects: [{ kind: 'reputation', value: -3 }],
          resultText: '🚪 闭门不出，邻村怨望，然本村得全。',
        },
      ],
    },
    {
      id: 'ev_merchant',
      title: '中山富商再来',
      emoji: '💰',
      situation: '张世平、苏双复至涿郡，见先主羽翼渐丰，欲再托重金，共图大事。',
      trigger: { type: 'flag', key: 'funded' },
      once: true,
      choices: [
        {
          id: 'c_accept',
          label: '接纳厚赀',
          desc: '受金以募兵，金 +45，声望 +2。',
          effects: [
            { kind: 'resource', gold: 45 },
            { kind: 'reputation', value: 2 },
          ],
          resultText: '💰 富商倾资助义，先主兵势愈壮。',
        },
        {
          id: 'c_decline',
          label: '婉言谢绝',
          desc: '不妄受财，声望 +1。',
          effects: [{ kind: 'reputation', value: 1 }],
          resultText: '🙏 辞金明志，乡里益敬其廉。',
        },
      ],
    },
  ],
};
