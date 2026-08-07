import React from 'react';
import { FunnelChart, Funnel, LabelList, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from 'components/ui/Card';

const DEFAULT_COLORS = ['#059669', '#0891b2', '#2563eb', '#7c3aed', '#d97706', '#e11d48'];

// Reusable funnel chart card — data: [{ name, value }], each stage typically
// smaller than the one before it (e.g. Vacancies → Applicants → ... → Selected).
const FunnelChartCard = ({ title, data, colors = DEFAULT_COLORS, height = 300 }) => (
  <Card>
    {title && (
      <CardHeader className="py-4">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
    )}
    <CardContent className="p-4">
      <ResponsiveContainer width="100%" height={height}>
        <FunnelChart>
          <Tooltip />
          <Funnel data={data} dataKey="value" nameKey="name" isAnimationActive>
            <LabelList position="right" dataKey="name" fill="#334155" stroke="none" fontSize={12} />
            <LabelList position="center" dataKey="value" fill="#fff" stroke="none" fontSize={13} fontWeight={600} />
            {data.map((entry, i) => (
              <Cell key={entry.name} fill={colors[i % colors.length]} />
            ))}
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

export default FunnelChartCard;
