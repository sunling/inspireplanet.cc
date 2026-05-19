import React from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  FormGroup,
  Rating,
  Stack,
} from '@mui/material';
import { SurveyQuestion } from '../netlify/types/survey';

interface QuestionRendererProps {
  question: SurveyQuestion;
  value: any;
  onChange: (value: any) => void;
  index?: number;
  error?: boolean;
  helperText?: string;
  readOnly?: boolean;
}

const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  value,
  onChange,
  index,
  error = false,
  helperText,
  readOnly = false,
}) => {
  const renderQuestion = () => {
    switch (question.type) {
      case 'text':
        return (
          <TextField
            fullWidth
            multiline
            rows={3}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder || '请输入...'}
            error={error}
            helperText={helperText}
            disabled={readOnly}
          />
        );

      case 'single':
        return (
          <FormControl error={error} component="fieldset">
            <RadioGroup
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
            >
              {question.options?.map((option) => (
                <FormControlLabel
                  key={option.id}
                  value={option.value}
                  control={<Radio disabled={readOnly} />}
                  label={option.text}
                />
              ))}
            </RadioGroup>
            {error && helperText && (
              <Typography
                variant="caption"
                color="error"
                sx={{ mt: 0.5, ml: 2 }}
              >
                {helperText}
              </Typography>
            )}
          </FormControl>
        );

      case 'multiple':
        const selectedValues = value
          ? Array.isArray(value)
            ? value
            : [value]
          : [];
        return (
          <FormControl error={error} component="fieldset">
            <FormGroup>
              {question.options?.map((option) => {
                const isChecked = selectedValues.includes(option.value);
                return (
                  <FormControlLabel
                    key={option.id}
                    control={
                      <Checkbox
                        checked={isChecked}
                        onChange={(e) => {
                          if (readOnly) return;
                          if (e.target.checked) {
                            onChange([...selectedValues, option.value]);
                          } else {
                            onChange(
                              selectedValues.filter(
                                (v: string) => v !== option.value
                              )
                            );
                          }
                        }}
                        disabled={readOnly}
                      />
                    }
                    label={option.text}
                  />
                );
              })}
            </FormGroup>
            {error && helperText && (
              <Typography
                variant="caption"
                color="error"
                sx={{ mt: 0.5, ml: 2 }}
              >
                {helperText}
              </Typography>
            )}
          </FormControl>
        );

      case 'rating':
        const maxRating = question.maxRating || 5;
        return (
          <Box>
            <Stack spacing={1}>
              <Rating
                value={value || 0}
                max={maxRating}
                onChange={(_, newValue) => {
                  if (!readOnly) onChange(newValue);
                }}
                size="large"
              />
              <Typography variant="body2" color="text.secondary">
                {value
                  ? `${value} / ${maxRating} 分`
                  : `请选择 1-${maxRating} 分`}
              </Typography>
            </Stack>
            {error && helperText && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                {helperText}
              </Typography>
            )}
          </Box>
        );

      case 'date':
        return (
          <TextField
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            error={error}
            helperText={helperText}
            disabled={readOnly}
            InputLabelProps={{ shrink: true }}
          />
        );

      default:
        return (
          <Typography color="error">未知的问题类型: {question.type}</Typography>
        );
    }
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
        {index !== undefined && (
          <Typography variant="subtitle2" color="primary" sx={{ minWidth: 24 }}>
            Q{index + 1}.
          </Typography>
        )}
        <Box sx={{ flex: 1 }}>
          <Typography variant="body1" fontWeight={500}>
            {question.title}
            {question.required && (
              <Typography component="span" color="error">
                {' '}
                *
              </Typography>
            )}
          </Typography>
          {question.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {question.description}
            </Typography>
          )}
        </Box>
      </Box>
      <Box sx={{ mt: 1.5, ml: index !== undefined ? 4 : 0 }}>
        {renderQuestion()}
      </Box>
    </Box>
  );
};

export default QuestionRenderer;
