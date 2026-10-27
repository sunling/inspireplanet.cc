import { supabase } from '../../database/supabase';
import {
  EpisodePublication,
  parseEpisodePublication,
} from '../../utils/episodePublication';
import {
  EpisodeSummary,
  EpisodeTopic,
  WeeklyCard,
} from '../services/weeklyCards';

const GITHUB_OWNER = 'sunling';
const GITHUB_REPO = 'inspire-planet';
const GITHUB_BRANCH = 'main';

const TREE_API_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/trees/${GITHUB_BRANCH}?recursive=1`;
const RAW_BASE_URL = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}`;

const TREE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface GitHubEpisodeEntry {
  year: number;
  dateRaw: string; // YYYYMMDD
  dateFormatted: string; // YYYY-MM-DD
  episodeNum: number;
  episode: string; // EPXX
  folderPath: string; // events/{year}/{YYYYMMDD}-epXX
  path?: string; // quote-cards.json path
  sha?: string; // quote-cards.json sha
  summaryPath?: string; // summary.json path
  summarySha?: string;
  recapPath?: string; // recap.md path
  recapSha?: string;
  publicationPath?: string;
  publicationSha?: string;
}

interface RawQuoteCard {
  name?: string;
  title?: string;
  quote?: string;
  detail?: string;
  episode?: string;
  image_path?: string;
}

let cachedTreeEntries: GitHubEpisodeEntry[] | null = null;
let cachedTreeTimestamp = 0;

// Cache parsed cards and summaries by git blob sha (immutable per content) or path
const episodeCardsCache = new Map<string, WeeklyCard[]>();
const episodeSummaryCache = new Map<string, EpisodeSummary>();
const episodePublicationCache = new Map<string, EpisodePublication>();

function getGitHubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'inspireplanet-cc',
  };
  const token =
    typeof process !== 'undefined' && process.env
      ? process.env.GITHUB_TOKEN || process.env.GH_TOKEN
      : undefined;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function getGitHubEpisodeEntries(): Promise<GitHubEpisodeEntry[]> {
  const now = Date.now();
  if (cachedTreeEntries && now - cachedTreeTimestamp < TREE_CACHE_TTL_MS) {
    return cachedTreeEntries;
  }

  try {
    const response = await fetch(TREE_API_URL, {
      headers: getGitHubHeaders(),
    });

    if (!response.ok) {
      throw new Error(
        `GitHub tree API failed: ${response.status} ${response.statusText}`
      );
    }

    const payload = (await response.json()) as {
      tree?: Array<{ path?: string; type?: string; sha?: string }>;
    };

    const byFolder = new Map<string, GitHubEpisodeEntry>();

    for (const item of payload.tree || []) {
      if (item.type !== 'blob' || !item.path) continue;

      const match = item.path.match(
        /^(events\/(\d{4})\/(\d{8})-ep(\d+))\/(quote-cards\.json|summary\.json|episode-publication\.json|recap\.md|gzh-ep\d+\.md)$/i
      );
      if (!match) continue;

      const folderPath = match[1];
      const year = Number.parseInt(match[2], 10);
      const dateRaw = match[3];
      const episodeNum = Number.parseInt(match[4], 10);
      const fileName = match[5].toLowerCase();

      if (!Number.isFinite(year) || !Number.isFinite(episodeNum)) continue;

      let entry = byFolder.get(folderPath);
      if (!entry) {
        const dateFormatted = `${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6, 8)}`;
        const episode = `EP${String(episodeNum).padStart(2, '0')}`;
        entry = {
          year,
          dateRaw,
          dateFormatted,
          episodeNum,
          episode,
          folderPath,
        };
        byFolder.set(folderPath, entry);
      }

      if (fileName === 'quote-cards.json') {
        entry.path = item.path;
        entry.sha = item.sha || item.path;
      } else if (fileName === 'episode-publication.json') {
        entry.publicationPath = item.path;
        entry.publicationSha = item.sha || item.path;
      } else if (fileName === 'summary.json') {
        entry.summaryPath = item.path;
        entry.summarySha = item.sha || item.path;
      } else if (fileName === 'recap.md' || fileName.startsWith('gzh-ep')) {
        entry.recapPath = item.path;
        entry.recapSha = item.sha || item.path;
      }
    }

    const entries = Array.from(byFolder.values());

    // Sort newest first: year DESC, episodeNum DESC, dateRaw DESC
    entries.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      if (b.episodeNum !== a.episodeNum) return b.episodeNum - a.episodeNum;
      return b.dateRaw.localeCompare(a.dateRaw);
    });

    cachedTreeEntries = entries;
    cachedTreeTimestamp = now;
    return entries;
  } catch (error) {
    console.warn('Failed to fetch GitHub episode tree:', error);
    if (cachedTreeEntries) {
      return cachedTreeEntries;
    }
    throw error;
  }
}

export async function fetchEpisodeCardsFromGitHub(
  entry: GitHubEpisodeEntry
): Promise<WeeklyCard[]> {
  if (!entry.path) return [];

  const cacheKey = `${entry.path}:${entry.sha || ''}`;
  const cached = episodeCardsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const rawUrl = `${RAW_BASE_URL}/${entry.path}`;
  const response = await fetch(rawUrl, {
    headers: { 'User-Agent': 'inspireplanet-cc' },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${rawUrl}: ${response.status} ${response.statusText}`
    );
  }

  const rawCards = (await response.json()) as RawQuoteCard[];
  if (!Array.isArray(rawCards)) {
    return [];
  }

  // Noon UTC ensures the calendar date YYYY-MM-DD is identical in both Asia/Shanghai and Americas timezones
  const createdIso = `${entry.dateFormatted}T12:00:00.000Z`;
  const epCode = `ep${String(entry.episodeNum).padStart(2, '0')}`;

  const cards: WeeklyCard[] = rawCards
    .filter((c) => c && (c.title || c.quote))
    .map((c, index) => {
      const epNum = Number(c.episode?.match(/\d+/)?.[0] || entry.episodeNum);
      const normalizedEp = `EP${String(epNum).padStart(2, '0')}`;
      return {
        id: `${entry.year}-${epCode}-${index + 1}`,
        episode: normalizedEp,
        name: String(c.name || '').trim(),
        title: String(c.title || '').trim(),
        quote: String(c.quote || '').trim(),
        detail: String(c.detail || '').trim(),
        ...(c.image_path ? { image_path: c.image_path } : {}),
        created: createdIso,
      };
    });

  episodeCardsCache.set(cacheKey, cards);
  return cards;
}

function parseRecapMarkdownToSummary(
  markdown: string,
  entry: GitHubEpisodeEntry
): EpisodeSummary | null {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  let mainTitle = `启发星球 ${entry.episode}`;
  const introParagraphs: string[] = [];
  const topics: EpisodeTopic[] = [];

  let currentSectionTitle: string | null = null;
  let currentSectionParas: string[] = [];

  const flushSection = () => {
    if (!currentSectionTitle) return;
    if (
      currentSectionTitle.includes('参与启发星球') ||
      currentSectionTitle.includes('加入')
    ) {
      currentSectionTitle = null;
      currentSectionParas = [];
      return;
    }

    let speaker = '';
    let topicTitle = currentSectionTitle;
    const colonMatch = currentSectionTitle.match(
      /^([^：:]{1,12})[：:]\s*(.+)$/
    );
    if (colonMatch) {
      speaker = colonMatch[1].trim();
      topicTitle = colonMatch[2].trim();
    }

    const cleanedParas = currentSectionParas
      .map((p) => p.trim())
      .filter((p) => p && !p.startsWith('<!--') && p !== '---');

    if (cleanedParas.length > 0) {
      let quote: string | undefined;
      const bodyParas: string[] = [];

      for (const p of cleanedParas) {
        if (
          !quote &&
          ((p.startsWith('“') && p.endsWith('”')) ||
            (p.startsWith('"') && p.endsWith('"')) ||
            p.startsWith('>'))
        ) {
          quote = p.replace(/^[>“"]+|[”"]+$/g, '').trim();
        } else {
          bodyParas.push(p);
        }
      }

      const paras = bodyParas.length > 0 ? bodyParas : cleanedParas;
      const contextText = paras[0] || '';
      const keyPoints =
        paras.length > 2
          ? paras.slice(1, -1)
          : paras.length === 2
            ? [paras[1]]
            : [];
      const discussionText =
        paras.length > 2 ? paras[paras.length - 1] : undefined;

      topics.push({
        speaker,
        title: topicTitle,
        context: contextText,
        ...(keyPoints.length > 0 ? { keyPoints } : {}),
        summary: paras.slice(0, 2).join('\n\n'),
        ...(discussionText ? { discussion: discussionText } : {}),
        ...(quote ? { quote } : {}),
      });
    }

    currentSectionTitle = null;
    currentSectionParas = [];
  };

  let buffer: string[] = [];
  const flushParagraph = () => {
    if (buffer.length === 0) return;
    const para = buffer.join(' ').trim();
    buffer = [];
    if (!para || para === '---' || para.startsWith('<!--')) return;
    if (currentSectionTitle) {
      currentSectionParas.push(para);
    } else {
      introParagraphs.push(para);
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('# ')) {
      flushParagraph();
      const rawHeading = line.replace(/^#\s+/, '').trim();
      const parts = rawHeading.split(/[｜|]/);
      mainTitle = (
        parts.length > 1 ? parts.slice(1).join('｜') : rawHeading
      ).trim();
    } else if (line.startsWith('## ')) {
      flushParagraph();
      flushSection();
      currentSectionTitle = line.replace(/^##\s+/, '').trim();
    } else if (line === '') {
      flushParagraph();
    } else {
      buffer.push(line);
    }
  }
  flushParagraph();
  flushSection();

  if (topics.length === 0 && introParagraphs.length === 0) {
    return null;
  }

  const cleanIntro = introParagraphs.filter(
    (p) => !(p.startsWith('“') && p.endsWith('”') && p.length < 40)
  );

  return {
    episode: entry.episode,
    date: entry.dateFormatted,
    title: mainTitle,
    overview: (cleanIntro.length > 0 ? cleanIntro : introParagraphs).join(
      '\n\n'
    ),
    topics,
  };
}

const FALLBACK_SUMMARIES: Record<string, EpisodeSummary> = {
  '2026-EP40': {
    episode: 'EP40',
    date: '2026-10-10',
    title: '走出工作的“无聊之地”、回看一个月的记录，与妈妈微信里的小助手',
    overview:
      '这一期围绕三个真实的生活与工作切片展开：李影从一本儿童读物对照工作模板化时的“无聊之地”；抹茶复盘了三人记录营运转一个月后如何看清加班背后的协作问题；孙玲则分享了把本地模型探索与妈妈的微信助手需求拆开、用云托管落地小实验的过程。',
    topics: [
      {
        speaker: '李影',
        title: '走出工作的“无聊之地”：带着问题重新找回观察',
        context:
          '朋友寄来儿童读物《The Phantom Tollbooth》，李影从最初抗拒英文书名，到跟着主人公走过“期待之地”与“无聊之地”，联想到自己工作进入熟悉模板后的状态。',
        keyPoints: [
          '从“期待”到真实经历：做一件事前脑海里总有预设的期待，但真正走进去经历时，感受往往和最初的想象不同。',
          '为什么会滑入“无聊之地”：书里把“做一件事时失去观察和思考”称为无聊之地，对照工作中按部就班套模板的阶段，人很容易因为不再提问而感到乏味。',
          '在熟悉工作里主动提问：最近做同样的工作时，她试着追问自己的责任边界、还能多做一步什么、能否把经验整理成流程交给别人，同样一件事开始变得有意思。',
        ],
        quote: '当你做一件事情，在过程中失去了观察和思考，就会变得无聊。',
        discussion:
          '抹茶追问：当工作空间变成复用模板，加上用 AI 后原本一天完成的事被期待两小时做完，是否反而挤压了思考时间？李影回应，AI 确实改变了节奏，但质疑 AI 给出的结果、提出更具体的问题并监督它往正确方向走，这个过程本身仍有好奇与思考的空间。',
      },
      {
        speaker: '抹茶',
        title: '回看记录与工作协作：让复盘真正发生',
        context:
          '抹茶发起了三个人参与的记录营，实验“每日按模板记录 + 周末共同回看 + 月末梳理时间流向”，并在国庆前连续加班的记录里看到了之前没注意到的结构问题。',
        keyPoints: [
          '记录需要被“再用一次”：过去只写不看很容易流于形式；当每周末和伙伴一起回看本周发生的事与下周计划时，复盘才真正发生。',
          '从自责加班到看清协作链条：回看国庆前连续加班的记录时，她发现超时不只是个人工作习惯，还源于上游交付质量、返工和排期不合理，解决方向是去优化协作而非单纯堆时间。',
          '为什么选择结伴记录：相比单独付费找教练或咨询师，和同伴一起记录回看多了一份真实的陪伴——看见别人也有纠结、害怕和旧习惯，也在带着惶恐尝试行动，面对旧习惯时便没那么孤独。',
        ],
        quote: '每次都回看，它就会让这个复盘真正地发生。',
        discussion:
          '现场伙伴对“把记录拿回来再用一次”产生共鸣，讨论了日记录、周复盘与月度时间流向如何串成闭环，帮助自己从情绪自责转向具体行动。',
      },
      {
        speaker: '孙玲',
        title: '给妈妈做微信助手：把技术探索与家人的需求分开',
        context:
          '孙玲原本买回电脑想同时满足“自己探索本地大模型”和“给妈妈做微信聊天助手”两个目标，折腾一通后决定把两件事拆开。',
        keyPoints: [
          '亲手试过才知边界：深夜买回电脑配置本地模型后，发现实际运行体验并不理想，难以稳定支撑妈妈日常随时微信聊天的需求。',
          '把个人技术探索与妈妈的需求解耦：她决定退掉电脑，改用云服务托管把助手接进妈妈熟悉的微信，配置了早安问候、节日问候和日常小提醒，妈妈已经开始愿意打字互动。',
          '走过的弯路也是真实反馈：她并不觉得买电脑再退掉是错误的决定——正是亲自下载、搭建和体验过，才有了真切的体感，也才看清更合适的方案。',
        ],
        quote: '只有自己尝试过了之后，我才有一些真切的感受。',
        discussion:
          '李影追问本地技术探索是否因此停下，孙玲表示仍在继续探索；现场也有伙伴提到真人情感与陪伴不可替代，孙玲明确回应，微信助手只是日常辅助实验，AI 无法代替自己的关心。',
      },
    ],
    highlights: [
      '首次参与的伙伴从陪孩子读书的经历出发，聊到儿童绘本在不同年龄读出的层次，以及真人互动与 AI 陪伴之间的感受差异。',
      '大家在会上一起讨论了如何将每期整理的内容沉淀到公开的 GitHub 仓库，以及后续问题圆桌的设想。',
    ],
  },
  '2026-EP39': {
    episode: 'EP39',
    date: '2026-10-03',
    title: '写给十年后自己的那一天、给妈妈搭微信里的 AI，与关于智慧的追问',
    overview:
      '这一期，Grace 与 Michael 从“AI 若能说出智慧的话，人算什么”聊到知识筛选与身体连接；孙玲分享了想为妈妈搭微信 AI 助手的念头，并与在场的王有林展开了一场两代人视角的真实对话；李影则通过翻找五个月前的照片与备忘录，复原了独自在茂宜岛夜路开车的细节。',
    topics: [
      {
        speaker: 'Grace & 翟然Michael',
        title: '当 AI 能说出充满智慧的话，我们如何面对知识与自己',
        context:
          'Grace 读到书中用房屋比喻“智慧、理解与知识”的段落，抛出一个追问：如果有一天 AI 也能说出世代积累的智慧，人类的独特之处在哪里？',
        keyPoints: [
          '关于智慧的追问：书中说用智慧建造房屋、用理解稳固结构、用知识填满房间；Grace 好奇当 AI 也能输出看似有智慧的判断时，人该如何定义自己。',
          '做自己的“AI 垃圾分类员”：Michael 从层出不穷的 AI 热词聊到日常信息过载，与其堆砌精致的概念，他更关心哪些内容能真正进入自己的课堂与生活。',
          '回到身体的真实连接：Michael 分享了自己坚持跑步三个月、配合力量训练的体感变化——比起抽象的理论，身体跑起来后的反馈是任何工具都无法代劳的。',
        ],
        quote:
          'AI 能说出一句像这样有智慧的话，和 AI 真正拥有智慧，它是一件事吗？',
        discussion:
          '李影把“生成一句有智慧的话”与“真正拥有智慧”区分开来：人会在失去、挫折与欢乐中形成理解，并做出选择、承担结果。孙玲也回应，每个人通过思考和行动形成智慧的过程本身独一无二，无法被替代。',
      },
      {
        speaker: '孙玲 & 王有林',
        title: '给妈妈搭一个住在微信里的 AI：创造与接受的双向对话',
        context:
          '孙玲看到有人把 AI 接进微信给妈妈使用，想到妈妈不用另学新工具就能像发微信一样提问、记账或接收提醒，决定先买设备试试；李影当场邀请在线的妈妈王有林从长辈视角回应。',
        keyPoints: [
          '从家人习惯出发的设想：妈妈平时最熟悉微信，主要说家乡话；如果把 AI 放进微信，也许能帮上日常问答和提醒的小忙。',
          '长辈日常用 AI 的真实两面：王有林分享自己曾用元宝查资料救急生病的小猫，但也遇到过聊茶叶包装时觉得 AI 回答敷衍、缺少真人的温度。',
          '两代人的坦诚对齐：谈到亲人沟通，王有林坦言更喜欢看真人、听本人说话；但在理解这只是“真人沟通之外的日常辅助与问答工具”后，她表示愿意不排斥、先去体验。',
        ],
        quote:
          '对你们来说是一个创造的过程，对我来说是接受的过程。不要因为觉得不熟悉就去排斥它，我觉得也就去体验它吧。',
        discussion:
          '两代人在现场直接交换了“子女不在身边时技术能做什么、不能替代什么”的真实顾虑，既保留了对真人情感连接的坚持，也留出了尝试新工具的空间。',
      },
      {
        speaker: '李影',
        title: '记忆里的考古：写给十年后自己的那一天',
        context:
          '读到一篇阿拉斯加旅行记录后，李影意识到自己五月在夏威夷茂宜岛独自开车的一天如果不写下来，十年后大概只剩一句“开了一整天车，累死了”。',
        keyPoints: [
          '用碎片素材拼回现场：她翻出五个月前的照片、视频、手机备忘录和聊天记录，把清晨海边跑步、民宿主人送的栀子花、不敢开的吉普车一点点复原出来。',
          '重回日落后的黑夜山路：顺着时间线往下写，她重新走回那天日落后独自开过漆黑崎岖山路的时刻，诚实面对当时一路都在害怕的自己。',
          '在文字里与父母重合：在最黑的那段山路上，她想起十几年前父母为谋生开车走山路运茶叶的经历——害怕并没有消失，但带着害怕依然继续往前开。',
        ],
        quote:
          '我并没有觉得不害怕。我开那段路一直都觉得很害怕，我还是一个人，我就是觉得，带着这些害怕我也在路上，然后继续往前开。',
        discussion:
          '大家聊到为什么时隔几个月依然值得动笔：把客观发生过的细节留下来，不是为了美化记忆，而是让十年后的自己还能摸到那一天的温度与勇气。',
      },
    ],
    highlights: [
      '两代人在现场围绕“子女不在身边时的微信 AI 助手”直接交换真实顾虑与期待，既有对真人温度的保留，也有对新尝试的开放。',
    ],
  },
  '2026-EP38': {
    episode: 'EP38',
    date: '2026-09-26',
    title: '从接住一句话到允许记录空白，再到问题圆桌里的第一次具体拆解',
    overview:
      '这一期，Grace 与翟然从即兴表演的冷场聊到如何少一点第一反应的“但是”和自我否定；孙玲与李影围绕记录工具聊到“允许记录有空白”；最后大家围绕 Zoey 带来的“做事容易在卡点中断”进行了第一次问题圆桌讨论。',
    topics: [
      {
        speaker: 'Grace & 翟然',
        title: '少一点脱口而出的“但是”，慢一点否定自己',
        context:
          'Grace 从一次线上双人即兴表演的冷场经历聊起，翟然则结合自己七年全英文开放式教学的日常，谈如何觉察第一反应里的防备与自我否定。',
        keyPoints: [
          '即兴表演里的冷场与复盘：在洗衣房场景里被问“是不是在这里工作”时，Grace 第一反应感到刻板印象冒犯，故意说不会英语导致冷场；事后对照即兴表演“Yes, and（先接住再延续）”原则，希望练习在第一反应的“but”之外多一点体谅。',
          '把“赠予原谅”放进日常：很多时候对方随口一句话并非恶意，练习先接住话头，也是给彼此留出余地。',
          '剔除自我否定的口头禅：翟然在用英语教书七年后，仍有元音发不准被学生笑的时候；今年他开始有意识地把“七年是不是太慢了”这类自我否定的话剔除，先看见负面念头，再慢慢改。',
        ],
        quote: '很多时候，对方一说一句话，自己大脑首先是 but。',
        discussion:
          '李影回应 Grace，当一个人感到羞耻或紧张时，给他留出空间、不增加羞耻感，本身就是一份很重要的礼物；办公室同事用幽默或积极视角接住话题的日常，也让翟然体会到觉察就是改变的开始。',
      },
      {
        speaker: '孙玲 & 李影',
        title: '写自己的历史，也允许记录有空白',
        context:
          '孙玲现场演示了自己开发的 Capture & Reflect 记录工具，李影则聊起连续高强度记录两个月后第一次遇到“连开口都不想说”的疲劳期。',
        keyPoints: [
          '降低记录的启动摩擦力：孙玲把打开电脑、建文件夹的琐碎步骤交给工具，用语音或文字随时留下生活片段，既像在写自己的历史，也能通过回看与陌生信息推荐突破信息茧房。',
          '允许记录有空白：李影连续两个月高频记录后，这周遇到完全不想记录的时刻，由此意识到记录是为了服务生活，允许某些时刻留白，到了想写的时候反而能重新进入表达的流动。',
          '专注工作之外的沉浸快乐：李影还分享了这周放下看不下去的书、安心看《知否》的快乐，并因为剧中人物成长重新对简·奥斯汀的《爱玛》产生好奇。',
        ],
        quote:
          '回看可以帮助我了解自己，突破一下信息茧房，是在帮助我看到更大的世界。',
        discussion:
          '大家聊到工具与习惯的关系：工具的意义是帮人在想记录时少一点阻碍，而心理上允许断更和留白，才能让记录长期陪伴生活。',
      },
      {
        speaker: 'Zoey（问题圆桌）',
        title: '当做事总在卡点中断：换一种方式描述自己',
        context:
          '启发星球第一次尝试“问题圆桌”。Zoey 在登录账号卡住、差点放弃参会后依然来到现场，带来自己做事不连续、遇到卡点就容易失焦的困惑。',
        keyPoints: [
          '先用开放式提问还原具体处境：大家没有直接给建议，而是先请 Zoey 回想最近一次跨过卡点的真实经历——哪怕刚刚登录会议受阻，她最终还是进来了。',
          '圆桌的边界提醒：孙玲在现场温和提醒，先用澄清式问题帮对方看清处境，或分享自己的相似经历，不需要直接教成年人做事。',
          '把自我定义改成行动方向：李影分享自己过去常说“我是个犹豫不决的人”，后来把描述换成“我想成为做事果敢的人”，从每天午餐快速做决定开始练习，在具体行动中改变自我认知。',
        ],
        quote:
          '我不是去强调自己的错误，而是在每一次行动中，向自己想要的方向前进。',
        discussion:
          '第一次问题圆桌确立了共同约定：提问阶段只提开放式、澄清式问题，分享阶段只讲自己的真实经历与做法，不替当事人下判断。',
      },
    ],
    highlights: [
      '首次尝试“问题圆桌”约定：提问阶段先提开放式、澄清式问题，分享阶段只讲自己的真实经历与做法，不替当事人下判断或直接给建议。',
    ],
  },
};

export async function fetchEpisodeSummaryFromGitHub(
  entry: GitHubEpisodeEntry
): Promise<EpisodeSummary | null> {
  // 1. Prefer structured summary.json from GitHub
  if (entry.summaryPath) {
    const cacheKey = `summary:${entry.summaryPath}:${entry.summarySha || ''}`;
    const cached = episodeSummaryCache.get(cacheKey);
    if (cached) return cached;

    try {
      const rawUrl = `${RAW_BASE_URL}/${entry.summaryPath}`;
      const response = await fetch(rawUrl, {
        headers: { 'User-Agent': 'inspireplanet-cc' },
      });
      if (response.ok) {
        const data = (await response.json()) as EpisodeSummary;
        if (data && data.title && Array.isArray(data.topics)) {
          episodeSummaryCache.set(cacheKey, data);
          return data;
        }
      }
    } catch (error) {
      console.warn(
        `Failed to fetch summary.json for ${entry.folderPath}:`,
        error
      );
    }
  }

  // 2. Built-in curated summary fallback before summary.json is pushed to GitHub
  const fallbackKey = `${entry.year}-${entry.episode}`;
  if (FALLBACK_SUMMARIES[fallbackKey]) {
    return FALLBACK_SUMMARIES[fallbackKey];
  }

  // 3. Fallback to parsing recap.md / gzh-epXX.md for historical episodes
  if (entry.recapPath) {
    const cacheKey = `recap:${entry.recapPath}:${entry.recapSha || ''}`;
    const cached = episodeSummaryCache.get(cacheKey);
    if (cached) return cached;

    try {
      const rawUrl = `${RAW_BASE_URL}/${entry.recapPath}`;
      const response = await fetch(rawUrl, {
        headers: { 'User-Agent': 'inspireplanet-cc' },
      });
      if (response.ok) {
        const md = await response.text();
        const parsed = parseRecapMarkdownToSummary(md, entry);
        if (parsed) {
          episodeSummaryCache.set(cacheKey, parsed);
          return parsed;
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch recap.md for ${entry.folderPath}:`, error);
    }
  }

  return null;
}

async function fetchConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function next(): Promise<void> {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await worker(items[idx]);
    }
  }

  const runners = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => next()
  );
  await Promise.all(runners);
  return results;
}

function getRecordYearAndEpisodeKey(card: WeeklyCard): string {
  const date = card.created ? new Date(card.created) : null;
  const year =
    date && !Number.isNaN(date.getTime())
      ? new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Shanghai',
          year: 'numeric',
        }).format(date)
      : '';
  const epNum = Number(card.episode?.match(/\d+/)?.[0] || 0);
  return `${year}-EP${String(epNum).padStart(2, '0')}`;
}

export async function getLatestWeeklyCards(): Promise<WeeklyCard[]> {
  try {
    const entries = (await getGitHubEpisodeEntries()).filter((e) => !!e.path);
    if (entries.length > 0) {
      return await fetchEpisodeCardsFromGitHub(entries[0]);
    }
  } catch (error) {
    console.warn(
      'Falling back to Supabase for getLatestWeeklyCards due to error:',
      error
    );
  }

  // Fallback to Supabase if GitHub is unreachable
  const { data: latestEpisode, error: episodeError } = await supabase
    .from('weekly_cards')
    .select('episode')
    .order('created', { ascending: false })
    .limit(1);

  if (episodeError || !latestEpisode || latestEpisode.length === 0) {
    return [];
  }

  const { data } = await supabase
    .from('weekly_cards')
    .select('*')
    .eq('episode', latestEpisode[0].episode)
    .order('created', { ascending: false });

  return (data as WeeklyCard[]) || [];
}

export async function getEpisodeSummary(
  episodeInput: string,
  yearInput?: string | number
): Promise<EpisodeSummary | null> {
  const digits = episodeInput.match(/\d+/)?.[0] || '';
  const targetEpNum = digits ? Number.parseInt(digits, 10) : NaN;
  const targetYear =
    yearInput !== undefined && yearInput !== null && String(yearInput).trim()
      ? Number.parseInt(String(yearInput), 10)
      : NaN;

  if (!Number.isFinite(targetEpNum)) return null;

  try {
    const entries = await getGitHubEpisodeEntries();
    const matching = entries.filter(
      (e) =>
        e.episodeNum === targetEpNum &&
        (!Number.isFinite(targetYear) || e.year === targetYear)
    );
    if (matching.length > 0) {
      const summary = await fetchEpisodeSummaryFromGitHub(matching[0]);
      if (summary) return summary;
    }
  } catch (error) {
    console.warn('Error fetching episode summary from GitHub:', error);
  }

  return null;
}

export async function getWeeklyCardsByEpisode(
  episodeInput: string,
  yearInput?: string | number
): Promise<WeeklyCard[]> {
  const digits = episodeInput.match(/\d+/)?.[0] || '';
  const targetEpNum = digits ? Number.parseInt(digits, 10) : NaN;
  const targetYear =
    yearInput !== undefined && yearInput !== null && String(yearInput).trim()
      ? Number.parseInt(String(yearInput), 10)
      : NaN;

  if (Number.isFinite(targetEpNum)) {
    try {
      const entries = await getGitHubEpisodeEntries();
      const matching = entries.filter(
        (e) =>
          e.path &&
          e.episodeNum === targetEpNum &&
          (!Number.isFinite(targetYear) || e.year === targetYear)
      );

      if (matching.length > 0) {
        return await fetchEpisodeCardsFromGitHub(matching[0]);
      }
    } catch (error) {
      console.warn(
        'Falling back to Supabase for getWeeklyCardsByEpisode due to error:',
        error
      );
    }
  }

  // Fallback to Supabase if not found in GitHub tree yet
  let query = supabase.from('weekly_cards').select('*');
  if (Number.isFinite(targetEpNum)) {
    const padded = `EP${String(targetEpNum).padStart(2, '0')}`;
    const unpadded = `EP${targetEpNum}`;
    query = query.in('episode', [padded, unpadded]);
  } else {
    query = query.ilike('episode', `%${episodeInput}%`);
  }
  query = query.order('created', { ascending: false });

  const { data: result, error } = await query;
  if (error || !result) {
    return [];
  }

  const records = result as WeeklyCard[];
  if (Number.isFinite(targetYear)) {
    return records.filter((r) => {
      const y = r.created ? new Date(r.created).getFullYear() : NaN;
      return y === targetYear;
    });
  }
  return records;
}

export async function getAllWeeklyCards(limit?: number): Promise<WeeklyCard[]> {
  let githubCards: WeeklyCard[] = [];
  const githubKeys = new Set<string>();
  let has2025ArchiveOnGitHub = false;

  try {
    const entries = (await getGitHubEpisodeEntries()).filter((e) => !!e.path);
    has2025ArchiveOnGitHub = entries.some((e) => e.year <= 2025);
    const perEpisodeLists = await fetchConcurrency(
      entries,
      12,
      async (entry) => {
        try {
          const cards = await fetchEpisodeCardsFromGitHub(entry);
          githubKeys.add(
            `${entry.year}-EP${String(entry.episodeNum).padStart(2, '0')}`
          );
          return cards;
        } catch (err) {
          console.warn(`Failed to fetch episode ${entry.path}:`, err);
          return [];
        }
      }
    );
    githubCards = perEpisodeLists.flat();
  } catch (error) {
    console.warn(
      'Failed to load all weekly cards from GitHub, falling back to Supabase:',
      error
    );
  }

  // Only query Supabase fallback if GitHub failed or 2025 archive hasn't been pushed yet
  let supabaseCards: WeeklyCard[] = [];
  if (githubCards.length === 0 || !has2025ArchiveOnGitHub) {
    try {
      const { data } = await supabase
        .from('weekly_cards')
        .select('*')
        .order('created', { ascending: false });
      if (data) {
        supabaseCards = (data as WeeklyCard[]).filter(
          (card) => !githubKeys.has(getRecordYearAndEpisodeKey(card))
        );
      }
    } catch (error) {
      // Ignore Supabase fallback errors if GitHub succeeded
    }
  }

  const combined = [...githubCards, ...supabaseCards].sort((a, b) => {
    const timeA = a.created ? new Date(a.created).getTime() : 0;
    const timeB = b.created ? new Date(b.created).getTime() : 0;
    if (timeB !== timeA) return timeB - timeA;
    const epA = Number(a.episode?.match(/\d+/)?.[0] || 0);
    const epB = Number(b.episode?.match(/\d+/)?.[0] || 0);
    return epB - epA;
  });

  if (limit && limit > 0) {
    return combined.slice(0, limit);
  }
  return combined;
}

/** Publication metadata is optional: its absence must not hide the recap/cards. */
export async function getEpisodePublication(
  episodeInput: string,
  yearInput?: string | number
): Promise<EpisodePublication | null> {
  if (!/^(?:EP)?\d+$/i.test(episodeInput)) return null;
  const episode = Number(episodeInput.replace(/^EP/i, ''));
  const hasYear = yearInput !== undefined && yearInput !== null;
  if (hasYear && !/^\d{4}$/.test(String(yearInput))) return null;
  try {
    const entries = await getGitHubEpisodeEntries();
    const entry = entries.find(
      (item) =>
        item.episodeNum === episode &&
        (!hasYear || item.year === Number(yearInput))
    );
    if (!entry?.publicationPath) return null;
    const cacheKey = `${entry.publicationPath}:${entry.publicationSha || ''}`;
    const cached = episodePublicationCache.get(cacheKey);
    if (cached) return cached;
    const response = await fetch(`${RAW_BASE_URL}/${entry.publicationPath}`, {
      headers: { 'User-Agent': 'inspireplanet-cc' },
    });
    if (!response.ok) return null;
    const publication = parseEpisodePublication(await response.json());
    if (publication) episodePublicationCache.set(cacheKey, publication);
    return publication;
  } catch (error) {
    console.warn(
      'Unable to read optional episode publication metadata:',
      error
    );
    return null;
  }
}
