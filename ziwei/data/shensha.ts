// ======================
// 杂曜与神煞定义
// ======================

export const CHANG_SHENG = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
export const BO_SHI = ['博士', '力士', '青龙', '小耗', '将军', '奏书', '飞廉', '喜神', '病符', '大耗', '伏兵', '官府'];
export const SUI_QIAN = ['岁建', '晦气', '丧门', '贯索', '官符', '小耗', '大耗', '龙德', '白虎', '天德', '吊客', '病符'];

export const SHEN_SHA_DB: Record<string, { type: '吉' | '凶'; category: string; field: string; rule: string }> = {
  '禄存': { type: '吉', category: '财星', field: '财富、稳定', rule: '主正财稳定、衣食无忧；与化禄同宫为“双禄”，财源更丰' },
  '天魁': { type: '吉', category: '贵人', field: '贵人（男性/长辈）', rule: '遇困得男性贵人助，利考试、求职' },
  '天钺': { type: '吉', category: '贵人', field: '贵人（女性/晚辈）', rule: '遇困得女性或异性贵人助，利合作' },
  '左辅': { type: '吉', category: '辅星', field: '助力', rule: '主得平辈朋友助力，事业顺遂' },
  '右弼': { type: '吉', category: '辅星', field: '助力', rule: '主得异性或晚辈助力，人缘佳' },
  '文昌': { type: '吉', category: '文星', field: '文运', rule: '主科甲功名，利考学文书' },
  '文曲': { type: '吉', category: '文星', field: '才艺', rule: '主口才艺术，异路功名' },
  '红鸾': { type: '吉', category: '桃花', field: '婚姻喜庆', rule: '主婚恋、添丁、喜事' },
  '天喜': { type: '吉', category: '桃花', field: '生育喜庆', rule: '随红鸾动，主喜事临门' },
  '火星': { type: '凶', category: '煞星', field: '突发、冲突', rule: '主急性意外、火伤；与贪狼成“火贪格”反主横财' },
  '铃星': { type: '凶', category: '煞星', field: '隐忍、爆发', rule: '主性格阴沉；与贪狼成“铃贪格”主偏财' },
  '擎羊': { type: '凶', category: '煞星', field: '刑伤', rule: '主刑罚伤灾，性刚烈' },
  '陀罗': { type: '凶', category: '煞星', field: '拖延', rule: '主暗晦拖延，性纠结' },
  '地空': { type: '凶', category: '空亡', field: '空亡', rule: '主物质损失，利精神修行' },
  '地劫': { type: '凶', category: '空亡', field: '破耗', rule: '主财物劫失，求财艰难' },
  '天刑': { type: '凶', category: '刑煞', field: '法律自律', rule: '利于军警法律，凶则主官非' },
  '天姚': { type: '凶', category: '桃花', field: '风流桃花', rule: '主烂桃花、放纵' },
  '孤辰': { type: '凶', category: '孤煞', field: '孤独', rule: '主孤独，不利六亲，男命忌' },
  '寡宿': { type: '凶', category: '孤煞', field: '孤独', rule: '主冷漠，不利婚姻，女命忌' },
  '天马': { type: '吉', category: '动星', field: '变动', rule: '主奔波、迁动，喜见禄存' },
  '截空': { type: '凶', category: '空煞', field: '阻碍', rule: '主中途受阻，半途而废' },
  '旬空': { type: '凶', category: '空煞', field: '虚耗', rule: '主空虚不实，计划落空' },
};