export interface RoundtableSession {
  sessionDate: string | null;
  episodeNumber: number | null;
  status: string;
}

export const roundtableEpisodeHref = (session: RoundtableSession) =>
  session.sessionDate &&
  session.episodeNumber &&
  ['scheduled', 'completed'].includes(session.status)
    ? `/episodes/${session.sessionDate.slice(0, 4)}/${session.episodeNumber}#roundtable`
    : null;

export const roundtableSessionLabel = (session: RoundtableSession) =>
  session.sessionDate && session.episodeNumber
    ? `${session.sessionDate} · EP${session.episodeNumber}`
    : '';
