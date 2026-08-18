import React from 'react';
import { PersonalEbook, EbookChapter } from '../../netlify/types';
import RichTextRenderer from '../../components/rich-text/RichTextRenderer';
import { EbookSection } from './ebook';

export const EBOOK_PRINT_CSS = `
@page {
  size: A4;
  margin: 20mm 18mm 18mm;
}
* {
  box-sizing: border-box;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
body { color: #302d29; font-family: "Noto Serif SC", "Songti SC", SimSun, serif; }
.ebook-native-print-output {
  background: #fffdf8;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
.ebook-print-cover {
  min-height: 235mm;
  padding: 25mm 18mm;
  color: #fffdf6;
  background: linear-gradient(145deg, #28463d 0%, #47695d 62%, #8e6850 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.ebook-print-kicker { font: 10pt sans-serif; letter-spacing: .22em; opacity: .78; }
.ebook-print-title { font-size: 34pt; line-height: 1.35; margin: 12mm 0 7mm; }
.ebook-print-subtitle { font-size: 13pt; line-height: 1.9; opacity: .84; max-width: 125mm; }
.ebook-print-meta { margin-top: 25mm; font: 10pt sans-serif; opacity: .72; }
.ebook-print-toc { }
.ebook-print-toc h1 { color: #3f554d; font-size: 25pt; margin: 0 0 12mm; }
.ebook-print-toc-group { margin: 0 0 7mm; }
.ebook-print-toc-group h2 { color: #9d5238; font-size: 13pt; margin: 0 0 3mm; }
.ebook-print-toc-list { list-style: none; margin: 0; padding: 0; }
.ebook-print-toc-list li { display: flex; align-items: baseline; margin: 2.5mm 0; break-inside: avoid; }
.ebook-print-toc-list a { color: #393531; display: block; width: 100%; text-decoration: none; }
.ebook-print-toc-list a::before, .ebook-print-toc-list a::after { content: none !important; }
.ebook-print-section-title { color: #9d5238; font-size: 21pt; break-after: avoid; margin: 0 0 8mm; }
.ebook-print-chapter { margin-bottom: 14mm; }
.ebook-print-chapter-title {
  font-size: 23pt;
  line-height: 1.45;
  margin: 0 0 4mm;
}
.ebook-print-date { color: #81786f; font: 9pt sans-serif; margin-bottom: 9mm; }
.ebook-print-content { font-size: 11pt; line-height: 1.95; white-space: pre-wrap; }
.ebook-print-content h2 { font-size: 18pt; margin: 9mm 0 4mm; break-after: avoid; }
.ebook-print-content h3 { font-size: 14pt; margin: 7mm 0 3mm; break-after: avoid; }
.ebook-print-content blockquote { border-left: 2px solid #b14f2b; color: #665e57; margin: 6mm 0; padding-left: 5mm; }
.ebook-print-content pre { background: #eeeae5; border-radius: 2mm; font: 9pt/1.7 monospace; padding: 4mm; white-space: pre-wrap; }
.ebook-print-content code { font-family: monospace; }
.ebook-print-images { display: flex; flex-wrap: wrap; gap: 4mm; margin: 6mm 0; }
.ebook-print-content img, .ebook-print-image { display: block; max-width: 400px; max-height: 400px; object-fit: contain; }
.ebook-print-content a { color: #8d452d; overflow-wrap: anywhere; }
.ebook-print-response { background: #f7f3eb; border-radius: 2mm; margin: 4mm 0; padding: 5mm; }
.ebook-print-response strong { display: block; margin-bottom: 2mm; }
`;

const formatPrintDate = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(value));

const getImageSize = (count: number) =>
  count <= 1 ? 400 : count <= 4 ? 280 : 180;

const ChapterContent: React.FC<{ chapter: EbookChapter }> = ({ chapter }) => {
  if (chapter.response_items?.length) {
    return (
      <>
        {chapter.response_items.map((item, index) => (
          <div className="ebook-print-response" key={index}>
            <strong>{item.question}</strong>
            <div className="ebook-print-content">{item.answer || '—'}</div>
          </div>
        ))}
      </>
    );
  }
  const templateItems =
    chapter.template_snapshot?.items.filter((item) => item.answer.trim()) || [];
  const hasBody = chapter.content.trim().length > 0;
  return (
    <>
      {templateItems.length > 0 &&
        templateItems.map((item) => (
          <div className="ebook-print-response" key={item.key}>
            <strong>{item.prompt}</strong>
            <div className="ebook-print-content">{item.answer}</div>
          </div>
        ))}
      {chapter.source === 'writing' &&
      chapter.editor_mode === 'rich' &&
      chapter.rich_content ? (
        <RichTextRenderer
          content={chapter.rich_content}
          className="ebook-print-content"
        />
      ) : hasBody ? (
        <div className="ebook-print-content">{chapter.content}</div>
      ) : null}
    </>
  );
};

interface Props {
  ebook: PersonalEbook;
  sections: EbookSection[];
}

const EbookPrintDocument: React.FC<Props> = ({ ebook, sections }) => (
  <div>
    <section className="ebook-print-cover">
      <div className="ebook-print-kicker">MY INSPIRATION BOOK</div>
      <h1 className="ebook-print-title">{ebook.owner.name}的启发之书</h1>
      <div className="ebook-print-subtitle">
        把散落在金句卡片、书写圈子与活动现场的思考，编成一本持续生长的个人电子书。
      </div>
      <div className="ebook-print-meta">
        共{' '}
        {
          new Set(
            sections.flatMap((section) =>
              section.chapters.map((chapter) => chapter.id)
            )
          ).size
        }{' '}
        篇收藏
      </div>
    </section>

    <nav className="ebook-print-toc">
      <h1>目录</h1>
      {sections.map((section) => (
        <div className="ebook-print-toc-group" key={section.id}>
          <h2>{section.title}</h2>
          <ol className="ebook-print-toc-list">
            {section.chapters.map((chapter) => (
              <li key={`${section.id}-${chapter.id}`}>
                <a href={`#print-${chapter.id}`}>{chapter.title}</a>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </nav>

    {sections.map((section) => (
      <section key={section.id}>
        {section.chapters.map((chapter) => (
          <article
            className="ebook-print-chapter"
            id={`print-${chapter.id}`}
            key={`${section.id}-${chapter.id}`}
          >
            <h1 className="ebook-print-chapter-title">{chapter.title}</h1>
            <div className="ebook-print-date">
              {formatPrintDate(chapter.created_at)} · {section.title}
            </div>
            {chapter.image_urls.length > 0 && (
              <div className="ebook-print-images">
                {chapter.image_urls.map((url) => {
                  const size = getImageSize(chapter.image_urls.length);
                  return (
                    <img
                      className="ebook-print-image"
                      src={url}
                      alt=""
                      key={url}
                      style={{ width: size, height: size }}
                    />
                  );
                })}
              </div>
            )}
            <ChapterContent chapter={chapter} />
          </article>
        ))}
      </section>
    ))}
  </div>
);

export default EbookPrintDocument;
