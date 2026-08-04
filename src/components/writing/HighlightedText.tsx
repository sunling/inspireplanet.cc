import React from 'react';
import { Box } from '@mui/material';
import { tokenizeHashtags } from '../../utils/hashtags';

interface HighlightedTextProps {
  text: string;
  hideHashtags?: boolean;
}

const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  hideHashtags = false,
}) => (
  <>
    {tokenizeHashtags(text).map((token, index) =>
      token.isHashtag && !hideHashtags ? (
        <Box
          component="span"
          key={`${token.text}-${index}`}
          sx={{
            color: '#496a61',
            fontWeight: 600,
          }}
        >
          {token.text}
        </Box>
      ) : token.isHashtag ? null : (
        <React.Fragment key={`text-${index}`}>{token.text}</React.Fragment>
      )
    )}
  </>
);

export default HighlightedText;
