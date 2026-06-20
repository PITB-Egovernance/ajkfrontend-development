import React, { useMemo } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Tooltip } from '@mui/material';

const defaultTooltipCell = (params) => {
  const val = params.formattedValue ?? params.value;
  if (val === null || val === undefined || val === '') return '';
  return (
    <Tooltip title={String(val)} arrow placement="top">
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
        {val}
      </span>
    </Tooltip>
  );
};

const TooltipDataGrid = ({ columns, ...rest }) => {
  const enhancedColumns = useMemo(
    () =>
      columns.map((col) => {
        if (col.renderCell) return col;
        return { ...col, renderCell: defaultTooltipCell };
      }),
    [columns]
  );

  return <DataGrid columns={enhancedColumns} {...rest} />;
};

export default TooltipDataGrid;
