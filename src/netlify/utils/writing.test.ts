import { describe, expect, it } from 'vitest';
import { mapWritingPost } from './writing';

const baseRow = {
  id: 1,
  user_id: 2,
  title: null,
  body: '保留纯文本',
  image_urls: [],
  visibility: 'public',
  status: 'published',
  created_at: '2026-08-15T00:00:00.000Z',
  updated_at: '2026-08-15T00:00:00.000Z',
  author: { id: 2, name: '作者' },
  topic_links: [],
};

describe('mapWritingPost rich-text compatibility', () => {
  it('keeps legacy posts in basic mode', () => {
    const post = mapWritingPost(baseRow, '2');
    expect(post.editor_mode).toBe('basic');
    expect(post.body_rich).toBeNull();
    expect(post.body).toBe('保留纯文本');
  });

  it('exposes a valid Tiptap document in rich mode', () => {
    const document = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: '正文' }] },
      ],
    };
    const post = mapWritingPost(
      { ...baseRow, editor_mode: 'rich', body_rich: document },
      '2'
    );
    expect(post.editor_mode).toBe('rich');
    expect(post.body_rich).toEqual(document);
  });

  it('falls back safely when rich JSON is malformed', () => {
    const post = mapWritingPost(
      { ...baseRow, editor_mode: 'rich', body_rich: { type: 'paragraph' } },
      '2'
    );
    expect(post.editor_mode).toBe('basic');
    expect(post.body_rich).toBeNull();
  });
});

describe('review source privacy', () => {
  it('shows the review badge to readers while keeping the source link owner-only', () => {
    const row = { ...baseRow, writing_type: 'review', review_source_id: 10 };
    expect(mapWritingPost(row, '2').review_source_id).toBe('10');
    expect(mapWritingPost(row, '3')).toMatchObject({
      writing_type: 'review',
      review_source_id: null,
    });
    expect(mapWritingPost(row, null).review_source_id).toBeNull();
  });
  it('keeps the review identity if the source has been deleted', () => {
    expect(
      mapWritingPost(
        { ...baseRow, writing_type: 'review', review_source_id: null },
        '2'
      )
    ).toMatchObject({ writing_type: 'review', review_source_id: null });
  });
});
