import { Chip, Stack } from '@mui/material';
import type { WritingPost } from '../../netlify/types';

export default function WritingSectionTemplates({
  post,
}: {
  post: WritingPost;
}) {
  const stored = post.body_rich?.writingSections as
    | { sections?: Array<{ kind?: string; template?: { name?: string } }> }
    | undefined;
  if (!Array.isArray(stored?.sections)) return null;

  return (
    <Stack
      direction="row"
      useFlexGap
      flexWrap="wrap"
      spacing={1}
      sx={{ mb: 1.5 }}
    >
      <Chip label="多段落" size="small" />
      {stored.sections.map((section, index) => {
        const name = section?.template?.name;
        return section?.kind === 'template' &&
          typeof name === 'string' &&
          name.trim() ? (
          <Chip
            key={index}
            label={name}
            size="small"
            color="secondary"
            variant="outlined"
            sx={{
              maxWidth: '100%',
              height: 'auto',
              '& .MuiChip-label': {
                whiteSpace: 'normal',
                overflowWrap: 'anywhere',
              },
            }}
          />
        ) : null;
      })}
    </Stack>
  );
}
