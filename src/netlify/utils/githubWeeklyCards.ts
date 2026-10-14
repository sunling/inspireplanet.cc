import { supabase } from '../../database/supabase';
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
        /^(events\/(\d{4})\/(\d{8})-ep(\d+))\/(quote-cards\.json|summary\.json|recap\.md|gzh-ep\d+\.md)$/i
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
        entry.sha = item.path && item.sha ? item.sha : item.path;
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
    const colonMatch = currentSectionTitle.match(/^([^：:]{1,12})[：:]\s*(.+)$/);
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

      const summaryText =
        bodyParas.slice(0, 2).join('\n\n') || cleanedParas[0] || '';
      const discussionText =
        bodyParas.length > 2 ? bodyParas.slice(2).join('\n\n') : undefined;

      topics.push({
        speaker,
        title: topicTitle,
        summary: summaryText,
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
      mainTitle = (parts.length > 1 ? parts.slice(1).join('｜') : rawHeading).trim();
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
    overview: (cleanIntro.length > 0 ? cleanIntro : introParagraphs).join('\n\n'),
    topics,
  };
}

const FALLBACK_SUMMARIES: Record<string, EpisodeSummary> = {
  '2026-EP40': {
    episode: 'EP40',
    date: '2026-10-10',
    title: '走出工作的“无聊之地”、回看一个月的记录，与妈妈微信里的小助手',
    overview:
      '这一期，李影从一本起初不想翻开的儿童读物《The Phantom Tollbooth》读到“期待之地”与“无聊之地”，聊起工作模板化时如何带着问题重新找回观察；抹茶分享了发起三人记录营、连续回看一个月后，从单纯自责加班转向梳理协作与排期问题的过程；孙玲则讲述了把本地模型探索与妈妈的微信助手需求分开、用云托管开启小实验的经历。',
    topics: [
      {
        speaker: '李影',
        title: '一本儿童读物，让我重新想了想工作的无聊',
        summary:
          '朋友寄来儿童读物《The Phantom Tollbooth》，李影起初连书名都不想弄懂，翻开后却跟着主人公接连走进“期待之地”和“无聊之地”。她想到自己开始一件事前总有脑海里的想象，真正走进去经历才会有不同的感受；而书里因为失去观察和思考滑入的“无聊之地”，也像极了工作中按部就班的阶段。最近做同样的工作时，她试着追问自己的责任边界、还能多做一步什么、能否把经验整理成流程交给别人，同样一件事开始变得有意思。',
        discussion:
          '抹茶回应，工作变成复用模板、决策空间变小时确实容易感到无聊，并提出疑问：用了 AI 之后，原本一天完成的事也许被期待两小时做完，是否反而挤压了思考时间？李影认同这种变化，只是对她而言，质疑 AI 给出的结果、提出更具体的问题并监督它往正确方向走，这个过程本身仍有好奇的空间。',
        quote: '当你做一件事情，在过程中失去了观察和思考，就会变得无聊。',
      },
      {
        speaker: '抹茶',
        title: '回看记录与工作协作：让复盘真正发生',
        summary:
          '抹茶发起了三个人参与的记录营：每天借助模板书写，每周末一起回看发生的事和下一步计划，月末再梳理时间流向。她发现把写过的内容拿回来再用一次，复盘才会真正发生。在梳理国庆前连续加班的记录时，她看见持续加班背后除了个人习惯，还有上游交付质量、返工和排期问题，需要去优化协作，而不是只投入更多个人时间。',
        discussion:
          '回应孙玲的分享时，抹茶也聊到为什么愿意费劲组织大家一起记录回看，而不是只花钱找教练或心理咨询师对谈：和其他人一起做这件事多了一份陪伴——看见别人也有纠结、害怕和旧习惯，也在带着惶恐与期待尝试不同的行动，面对习惯时便没有那么孤独。',
        quote: '每次都回看，它就会让这个复盘真正地发生。',
      },
      {
        speaker: '孙玲',
        title: '给妈妈做微信助手：把技术探索与家人的需求分开',
        summary:
          '孙玲既想探索本地模型，又想给妈妈做微信聊天助手，于是买回电脑从深夜开始配置。实际运行本地模型的体验并不理想，研究云端部署后，她决定退掉电脑，改用云服务托管把助手接进妈妈熟悉的微信，并设置了早安问候、节日问候和小提醒。妈妈已经愿意开始打字聊天，这个仍在观察中的小实验刚刚开始。',
        discussion:
          '李影追问本地技术的探索是否因此停下；孙玲说仍在探索，也不觉得买电脑是错误的决定——亲自下载、搭建和体验过，才有了真切的反馈，也才看见其他解决方案。现场也有伙伴提到真人情感与陪伴的重要，孙玲明确回应，AI 无法代替自己的关心。',
        quote: '只有自己尝试过了之后，我才有一些真切的感受。',
      },
    ],
    highlights: [
      '首次参与的伙伴从陪孩子阅读的经历出发，聊到儿童绘本在不同年龄读出的层次，以及真人互动与 AI 陪伴之间的感受差异。',
      '大家在会上一起讨论了如何将每期整理的内容沉淀到公开的 GitHub 仓库，以及后续问题圆桌的设想。',
    ],
  },
  '2026-EP39': {
    episode: 'EP39',
    date: '2026-10-03',
    title: '写给十年后自己的那一天、给妈妈搭微信里的 AI，与关于智慧的追问',
    overview:
      '这一期，Grace 从书里的一句话抛出“如果 AI 也能说出智慧的话，什么叫人类”的提问；Michael 从跑步与增肌聊到如何筛选涌入面前的大量知识；孙玲分享了买下 Mac mini 想为妈妈搭建微信 AI 助手的念头，并与在场的王有林展开了一场两代人视角的真实对话；李影则通过翻找五个月前的照片与备忘录，复原了独自在茂宜岛开车穿过黑夜山路的那一天。',
    topics: [
      {
        speaker: 'Grace & 翟然Michael',
        title: '当 AI 能说出充满智慧的话，我们如何面对知识与自己',
        summary:
          'Grace 读到书中用房屋比喻智慧、理解和知识的段落，好奇如果有一天 AI 拥有判断能力、能说出世代积累的智慧，人的定义会如何变化。Michael 由此想到智能手机时代到如今层出不穷的 AI 热词：他半开玩笑称自己为“AI 垃圾分类员”，比起堆砌精致的概念，更关心如何像跑步三个月后与身体建立连接那样，只筛选真正能融入自己课堂与生活的知识。',
        discussion:
          '李影把“生成一句有智慧的话”与“真正拥有智慧”区分开来：人会在失去、挫折与欢乐中形成理解，并做出选择、承担结果。孙玲也回应，每个人通过思考和行动形成智慧的过程本身是独一无二的，无法被替代。',
        quote:
          'AI 能说出一句像这样有智慧的话，和 AI 真正拥有智慧，它是一件事吗？',
      },
      {
        speaker: '孙玲 & 王有林',
        title: '给妈妈搭一个住在微信里的 AI：创造与接受的双向对话',
        summary:
          '孙玲看到有人把 AI 接进微信给妈妈使用，想到妈妈不用另学新工具就能像发微信一样提问、记账或接收提醒，哪怕妈妈主要说家乡话、还不确定能不能跑通，还是决定先买下设备试试看。李影当场邀请在线的妈妈王有林从长辈视角回应这一设想。',
        discussion:
          '王有林分享了自己平时用元宝救急抢救生病猫咪、以及聊茶叶包装觉得敷衍的两面体验。谈到亲人交流，她坦言更习惯看着真人、听本人说话，AI 分身仍缺少人的感觉；但在听完“在真人沟通基础上增加日常陪伴与知识问答”的解释后，她说这对年轻人是创造的过程，对自己是接受的过程，愿意不排斥、先去体验。',
        quote:
          '对你们来说是一个创造的过程，对我来说是接受的过程。不要因为觉得不熟悉就去排斥它，我觉得也就去体验它吧。',
      },
      {
        speaker: '李影',
        title: '记忆里的考古：写给十年后自己的那一天',
        summary:
          '读到一篇阿拉斯加旅行记录后，李影想到自己五月在夏威夷茂宜岛独自开车的一天：如果现在不写，十年后大概只剩一句“开了一整天车，累死了”。她翻出照片、视频、手机备忘录和聊天记录重新拼合细节——清晨的海边跑步、民宿主人送的栀子花、不敢开的吉普车，以及日落后独自开过漆黑崎岖山路时的恐惧。',
        discussion:
          '在那段最黑的山路上，李影想起十几年前父母为谋生开车走山路运茶叶的经历，觉得自己此刻与父母重合在了一起：害怕并没有消失，但带着害怕依然继续往前开。把这些细节客观留下来后，那一天的温度与陪伴感才重新浮现。',
        quote:
          '我并没有觉得不害怕。我开那段路一直都觉得很害怕，我还是一个人，我就是觉得，带着这些害怕我也在路上，然后继续往前开。',
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
      '这一期，Grace 从线上即兴表演的一次冷场聊起“放下第一反应的但是、赠予一份原谅”；翟然分享了七年英语教学里如何慢慢剔除自我否定的话语；孙玲演示了自己的记录与回看工具，并和李影聊到“记录疲劳时允许空白”；李影从《知否》聊到重拾对《爱玛》的好奇；最后大家围绕 Zoey 带来的“做事容易在卡点中断”进行了第一次问题圆桌讨论。',
    topics: [
      {
        speaker: 'Grace & 翟然',
        title: '少一点脱口而出的“但是”，慢一点否定自己',
        summary:
          'Grace 在双人即兴表演的洗衣房场景里被问“是不是在这里工作”，第一反应感到刻板印象冒犯，故意说不会英语导致冷场。事后回看即兴表演“yes, and（先接住再延续）”的原则，她希望练习在第一反应的“但是”之外多一点体谅，把这份练习称为“赠予原谅”。翟然接着回应，自己在开放式教学中用英语教书七年，虽仍有元音发不准被学生笑的时候，但今年开始练习把“七年是不是太慢了”这类自我否定的话剔除，先看见负面念头，再慢慢改。',
        discussion:
          '李影回应 Grace，当一个人感到羞耻或紧张时，给他留出空间、不增加羞耻感，本身就是一份很重要的礼物；办公室同事用幽默或积极视角接住话题的日常，也让翟然体会到觉察本身就是改变的开始。',
        quote: '很多时候，对方一说一句话，自己大脑首先是 but。',
      },
      {
        speaker: '孙玲 & 李影',
        title: '写自己的历史，也允许记录有空白',
        summary:
          '孙玲演示了自己开发的 Capture & Reflect 记录工具：把打开电脑、建文件夹的琐碎步骤交给工具，用语音或文字随时留下生活片段，既像在写自己的历史，也能通过回看与陌生信息推荐突破信息茧房。李影连续高强度记录两个月后，这周遇到连开口都不想说的时刻，由此意识到记录是为了服务生活，允许某些时刻留白，到了想写的时候反而能重新进入表达的流动。',
        discussion:
          '李影还分享了这周放下看不下去的书、安心沉浸在七十多集《知否》里的快乐，并因为明兰的成长重新对简·奥斯汀的《爱玛》产生好奇——工作足够专注之后，找到一件能取悦自己的事沉浸其中，也是真实的幸福。',
        quote:
          '回看可以帮助我了解自己，突破一下信息茧房，是在帮助我看到更大的世界。',
      },
      {
        speaker: 'Zoey（问题圆桌）',
        title: '当做事总在卡点中断：换一种方式描述自己',
        summary:
          '启发星球第一次尝试“问题圆桌”。Zoey 在登录账号卡住、差点放弃参会后依然来到现场，带来自己做事不连续、遇到卡点就容易失焦的困惑。大家先用开放式提问帮她把最近一次跨过卡点的经历说具体。',
        discussion:
          '孙玲在现场温和提醒大家：先用澄清式问题帮对方看清处境，或分享自己的相似经历，不需要直接教成年人做事。李影分享了自己过去常把自己定义为“犹豫不决的人”，后来把描述换成“我想成为做事果敢的人”，从午餐快速做决定开始练习，在每一次行动中向想要的方向靠近。',
        quote:
          '我不是去强调自己的错误，而是在每一次行动中，向自己想要的方向前进。',
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
    const perEpisodeLists = await fetchConcurrency(entries, 12, async (entry) => {
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
    });
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
