import { EbookChapter, EbookSource, WritingPost } from '../../netlify/types';

export type EbookOrder = 'time' | 'topic';

export interface EbookSection {
  id: string;
  title: string;
  chapters: EbookChapter[];
}

const txtDateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

export function buildEbookTxt(
  chapters: EbookChapter[],
  sources: EbookSource[]
): string {
  return chapters
    .filter((chapter) => sources.includes(chapter.source))
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .map((chapter) => {
      let content: string;
      if (chapter.response_items?.length) {
        content = chapter.response_items
          .map((item) => `${item.question}\n${item.answer || '—'}`)
          .join('\n\n');
      } else {
        const parts: string[] = [];
        if (chapter.template_snapshot?.items.length) {
          parts.push(
            ...chapter.template_snapshot.items
              .filter((item) => item.answer.trim())
              .map((item) => `${item.prompt}\n${item.answer}`)
          );
        }
        if (chapter.content.trim()) parts.push(chapter.content.trim());
        content = parts.join('\n\n');
      }
      return `日期：${txtDateFormatter.format(new Date(chapter.created_at))}\n内容：\n${content.trim()}`;
    })
    .join('\n\n--------------------\n\n');
}

export function buildWritingTxt(posts: WritingPost[]): string {
  const chapters: EbookChapter[] = posts.map((post) => ({
    id: `writing-${post.id}`,
    source: 'writing',
    title: post.title || post.template_snapshot?.template_name || '一则书写',
    summary: '',
    content: post.body || '',
    editor_mode: post.editor_mode,
    rich_content: post.body_rich || null,
    template_snapshot: post.template_snapshot || null,
    created_at: post.created_at,
    topics: post.topics.map((topic) => ({ id: topic.id, name: topic.name })),
    image_urls: post.image_urls,
    detail_url: `/writing-circle/${post.id}`,
  }));

  return buildEbookTxt(chapters, ['writing']);
}

const monthFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
});

export function buildEbookSections(
  chapters: EbookChapter[],
  order: EbookOrder,
  sources: EbookSource[]
): EbookSection[] {
  const visible = chapters
    .filter((chapter) => sources.includes(chapter.source))
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  const groups = new Map<string, EbookChapter[]>();

  visible.forEach((chapter) => {
    const groupNames =
      order === 'time'
        ? [monthFormatter.format(new Date(chapter.created_at))]
        : chapter.topics.length
          ? [chapter.topics[0].name]
          : ['未分类'];
    groupNames.forEach((name) => {
      const existing = groups.get(name) || [];
      if (!existing.some((item) => item.id === chapter.id)) {
        groups.set(name, [...existing, chapter]);
      }
    });
  });

  return Array.from(groups.entries())
    .map(([title, sectionChapters]) => ({
      id: `${order}-${title}`,
      title,
      chapters: sectionChapters,
    }))
    .sort((a, b) => {
      if (order === 'topic') return a.title.localeCompare(b.title, 'zh-CN');
      return (
        new Date(b.chapters[0]?.created_at || 0).getTime() -
        new Date(a.chapters[0]?.created_at || 0).getTime()
      );
    });
}
