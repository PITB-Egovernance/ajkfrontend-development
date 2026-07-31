import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from 'components/ui/Card';

const DEFAULT_COLORS = ['#059669', '#e11d48', '#2563eb', '#d97706', '#7c3aed', '#0891b2'];

// Reusable pie chart card — data: [{ name, value }].
const PieChartCard = ({ title, data, colors = DEFAULT_COLORS, height = 280 }) => (
  <Card>
    {title && (
      <CardHeader className="py-4">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
    )}
    <CardContent className="p-4">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={90} label>
            {data.map((entry, i) => (
              <Cell key={entry.name} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

export default PieChartCard;
