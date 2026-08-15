import { supabase } from '../../database/supabase';

const ADJECTIVES = [
  '清醒',
  '温柔',
  '安静',
  '自在',
  '明亮',
  '从容',
  '好奇',
  '轻盈',
  '真诚',
  '勇敢',
];
const NOUNS = [
  '萤火',
  '海棠',
  '松风',
  '星河',
  '云朵',
  '山雀',
  '灯塔',
  '麦穗',
  '月桂',
  '溪流',
];

const createCandidate = () => {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${adjective}${noun}${suffix}`;
};

export async function getOrCreateAnonymousAlias(
  userId: string
): Promise<string> {
  const { data: existing } = await supabase
    .from('writing_anonymous_aliases')
    .select('alias')
    .eq('user_id', userId)
    .maybeSingle();
  if (existing?.alias) return existing.alias;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { data, error } = await supabase
      .from('writing_anonymous_aliases')
      .insert({ user_id: userId, alias: createCandidate() })
      .select('alias')
      .single();
    if (!error && data?.alias) return data.alias;

    const { data: concurrent } = await supabase
      .from('writing_anonymous_aliases')
      .select('alias')
      .eq('user_id', userId)
      .maybeSingle();
    if (concurrent?.alias) return concurrent.alias;
  }

  throw new Error('anonymous alias allocation failed');
}
