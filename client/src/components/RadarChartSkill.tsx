import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { AnalysisMetrics } from '../api';

const RadarChartSkill = ({ metrics }: { metrics: AnalysisMetrics }) => {
  // Преобразуем объект в формат массива для Recharts
  const data = [
    { subject: 'Уверенность', A: metrics.confidence, fullMark: 100 },
    { subject: 'Лексика', A: metrics.vocabulary, fullMark: 100 },
    { subject: 'Структура', A: metrics.structure, fullMark: 100 },
    { subject: 'Эмпатия', A: metrics.empathy, fullMark: 100 },
    { subject: 'Краткость', A: metrics.conciseness, fullMark: 100 },
  ];

  return (
    <div style={{ width: '100%', height: 300, background: 'rgba(255,255,255,0.02)', borderRadius:'1rem', padding:'10px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.2)" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false}/>
          <Radar
            name="Mike"
            dataKey="A"
            stroke="#8b5cf6"
            strokeWidth={3}
            fill="#8b5cf6"
            fillOpacity={0.3}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RadarChartSkill;