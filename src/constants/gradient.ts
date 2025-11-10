// 背景渐变选项
export const gradientOptions = [
  { class: 'card-gradient-1', title: '🌈 彩虹梦境' },
  { class: 'card-gradient-2', title: '🌅 日出暖阳' },
  { class: 'card-gradient-3', title: '💜 紫色幻想' },
  { class: 'card-gradient-4', title: '🌊 海洋蓝调' },
  { class: 'card-gradient-5', title: '🔥 火焰橙黄' },
  { class: 'card-gradient-6', title: '🌿 清新绿意' },
  { class: 'card-gradient-7', title: '❤️ 热情红橙' },
  { class: 'card-gradient-8', title: '☁️ 天空蓝白' },
  { class: 'card-gradient-9', title: '🌫️ 雾霭灰蓝' },
  { class: 'card-gradient-10', title: '🍯 蜂蜜暖黄' },
  { class: 'card-gradient-11', title: '🌱 薄荷清绿' },
  { class: 'card-gradient-12', title: '🌸 淡雅紫粉' },
];

// 为每个渐变背景配置合适的字体颜色
export const gradientFontColors: Record<string, string> = {
  'card-gradient-1': '#2c3e50', // 彩虹梦境 - 深蓝灰
  'card-gradient-2': '#8b4513', // 日出暖阳 - 深棕色
  'card-gradient-3': '#4a148c', // 紫色幻想 - 深紫色
  'card-gradient-4': '#1e3a8a', // 海洋蓝调 - 深蓝色
  'card-gradient-5': '#2c3e50', // 火焰橙黄 - 深蓝灰
  'card-gradient-6': '#2d5016', // 清新绿意 - 深绿色
  'card-gradient-7': '#8b0000', // 热情红橙 - 深红色
  'card-gradient-8': '#1e3a8a', // 天空蓝白 - 深蓝色
  'card-gradient-9': '#6b7280', // 雾霭灰蓝 - 中性灰
  'card-gradient-10': '#8b4513', // 蜂蜜暖黄 - 深棕色
  'card-gradient-11': '#1a5d1a', // 薄荷清绿 - 深绿色
  'card-gradient-12': '#4a148c', // 淡雅紫粉 - 深紫色
  'card-gradient-13': '#8b4513', // 麦田金黄 - 深棕色
  'card-gradient-14': '#374151', // 月光银灰 - 深灰色
};

// 定义卡片渐变样式映射
const gradientStyles: Record<string, React.CSSProperties> = {
  'card-gradient-1': {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  'card-gradient-2': {
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  'card-gradient-3': {
    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  },
  'card-gradient-4': {
    background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  },
  'card-gradient-5': {
    background: 'linear-gradient(135deg, #00dbde 0%, #fc00ff 100%)',
  },
  'card-gradient-6': {
    background: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
  },
  'card-gradient-7': {
    background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  },
  'card-gradient-8': {
    background: 'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
  },
  'card-gradient-9': {
    background: 'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
  },
  'card-gradient-10': {
    background: 'linear-gradient(135deg, #eea849 0%, #f46b45 100%)',
  },
};

// 获取渐变对应的字体颜色
export const getFontColorForGradient = (gradientClass: string): string => {
  return gradientFontColors[gradientClass] || '#2c3e50';
};

// 共享的渐变背景配置
export const gradientClasses = [
  'card-gradient-1',
  'card-gradient-2',
  'card-gradient-3',
  'card-gradient-4',
  'card-gradient-5',
  'card-gradient-6',
  'card-gradient-7',
  'card-gradient-8',
  'card-gradient-9',
  'card-gradient-10',
  'card-gradient-11',
  'card-gradient-12',
  'card-gradient-13',
  'card-gradient-14',
];

// 定义渐变对应的搜索关键词
export const gradientSearchTerms = {
  'card-gradient-1': 'rainbow colorful abstract art',
  'card-gradient-2': 'sunrise warm orange yellow nature',
  'card-gradient-3': 'purple fantasy magical violet',
  'card-gradient-4': 'ocean blue water sea waves',
  'card-gradient-5': 'fire flame orange red energy',
  'card-gradient-6': 'green nature forest fresh leaves',
  'card-gradient-7': 'red orange passion warm sunset',
  'card-gradient-8': 'sky blue white clouds peaceful',
  'card-gradient-9': 'grey mist fog minimal calm',
  'card-gradient-10': 'honey yellow warm golden light',
  'card-gradient-11': 'mint green fresh nature spring',
  'card-gradient-12': 'purple pink soft pastel flowers',
  'card-gradient-13': 'golden wheat field warm autumn',
  'card-gradient-14': 'silver grey moonlight minimal',
};

// 获取随机渐变类
export function getRandomGradientClass() {
  return gradientClasses[Math.floor(Math.random() * gradientClasses.length)];
}
