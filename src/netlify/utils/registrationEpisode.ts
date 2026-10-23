import { supabase } from '../../database/supabase';
import {
  getEpisodeNumber,
  nextUTCOccurrenceDateStr,
} from '../../utils/recurring';
import { SubmissionError } from './surveySubmission';

export async function registrationEpisode(
  meetup: any,
  input: Record<string, any>
) {
  if (!meetup.is_recurring) {
    if (
      input.episode_date != null ||
      input.episode_number != null ||
      input.episode_id != null
    )
      throw new SubmissionError('此活动没有报名期次');
    return null;
  }
  const date = input.episode_date;
  if (
    typeof date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date
  )
    throw new SubmissionError('请选择有效的活动日期');
  let { data: episode, error } = await supabase
    .from('meetup_episodes')
    .select('id, date, episode_number')
    .eq('meetup_id', meetup.id)
    .eq('date', date)
    .maybeSingle();
  if (error) throw new SubmissionError('读取期次失败', 500);
  if (!episode) {
    // A virtual next occurrence may be persisted, but its number/date are derived
    // exclusively from the stored schedule. Never update organizer-edited metadata.
    if (
      !meetup.datetime ||
      !meetup.episode_start_date ||
      !Number.isFinite(Date.parse(meetup.datetime)) ||
      date !== nextUTCOccurrenceDateStr(meetup.datetime)
    )
      throw new SubmissionError('该日期尚未开放报名，请联系组织者');
    const number = getEpisodeNumber(meetup.episode_start_date, date);
    if (
      !Number.isSafeInteger(number) ||
      number < 1 ||
      (input.episode_number != null && Number(input.episode_number) !== number)
    )
      throw new SubmissionError('报名期数与活动日程不匹配');
    const { error: insertError } = await supabase
      .from('meetup_episodes')
      .upsert(
        {
          meetup_id: meetup.id,
          episode_number: number,
          date,
        },
        { onConflict: 'meetup_id,episode_number', ignoreDuplicates: true }
      );
    if (insertError) throw new SubmissionError('创建期次失败', 500);
    const result = await supabase
      .from('meetup_episodes')
      .select('id, date, episode_number')
      .eq('meetup_id', meetup.id)
      .eq('date', date)
      .maybeSingle();
    if (result.error || !result.data)
      throw new SubmissionError('期次编号冲突，请联系组织者', 409);
    episode = result.data;
  }
  if (
    (input.episode_number != null &&
      Number(input.episode_number) !== episode.episode_number) ||
    (input.episode_id != null && Number(input.episode_id) !== episode.id)
  )
    throw new SubmissionError('报名期次不匹配');
  return episode;
}
