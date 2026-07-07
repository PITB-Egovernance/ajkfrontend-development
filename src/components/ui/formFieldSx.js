const baseOutlinedFieldSx = {
  '& .MuiOutlinedInput-root': {
    minHeight: 40,
    borderRadius: 1.5,
    backgroundColor: '#ffffff',
  },
  '& .MuiOutlinedInput-root:not(.MuiInputBase-multiline)': {
    height: 40,
  },
  '& .MuiOutlinedInput-input': {
    padding: '8px 12px',
  },
  '& .MuiOutlinedInput-inputMultiline': {
    padding: '8px 12px',
  },
};

export const formFieldSx = baseOutlinedFieldSx;

export const formFieldAutoHeightSx = {
  ...baseOutlinedFieldSx,
  '& .MuiOutlinedInput-root': {
    ...baseOutlinedFieldSx['& .MuiOutlinedInput-root'],
    minHeight: 40,
    height: 'auto',
  },
};

export default baseOutlinedFieldSx;