import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, subDays, subMonths, addDays, differenceInDays } from 'date-fns';

type Range = '12days' | '3months' | '1year' | 'custom';

type Bucket = {
  name: string;
  start: Date;
  end: Date;
  totalIncome: number;
  totalExpense: number;
} & {
  [key: string]: number | string | Date;
};

export default function Charts() {
  const { transactions, categories } = useStore();
  const [range, setRange] = useState<Range>('12days');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [hiddenCategories, setHiddenCategories] = useState<string[]>([]);

  // Colors map
  const colorMap = useMemo(() => {
      const map: Record<string, string> = {};
      categories.forEach(c => map[c.name] = c.color);
      return map;
  }, [categories]);

  // Bar Data Preparation
  const barData = useMemo(() => {
    const toLocalMidnight = (d: Date | string) => {
        const dateObj = typeof d === 'string' ? new Date(d) : d;
        if (typeof d === 'string' && d.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [y, m, day] = d.split('-').map(Number);
            return new Date(y, m - 1, day, 0, 0, 0, 0);
        }
        const local = new Date(dateObj);
        local.setHours(0, 0, 0, 0);
        return local;
    };
  
    let start: Date;
    let end: Date;

    if (range === 'custom') {
      if (!customStart || !customEnd) return [];
      start = toLocalMidnight(customStart);
      end = toLocalMidnight(customEnd);
      if (end.getTime() < start.getTime()) {
        const tmp = start;
        start = end;
        end = tmp;
      }
    } else {
      const today = toLocalMidnight(new Date());
      today.setHours(23, 59, 59, 999);
      end = today;
      
      if (range === '12days') start = subDays(toLocalMidnight(new Date()), 11);
      else if (range === '3months') start = subMonths(toLocalMidnight(new Date()), 3);
      else start = subMonths(toLocalMidnight(new Date()), 12);
    }
    
    start = toLocalMidnight(start);
    end.setHours(23, 59, 59, 999);

    const durationDays = differenceInDays(end, start) + 1;
    const buckets: Bucket[] = [];

    if (range === 'custom') {
      if (durationDays < 12) {
        for (let i = 0; i < durationDays; i++) {
          const dayStart = addDays(start, i);
          const dayEnd = new Date(dayStart);
          dayEnd.setHours(23, 59, 59, 999);
          buckets.push({
            name: format(dayStart, 'MM-dd'),
            start: dayStart,
            end: dayEnd,
            totalIncome: 0,
            totalExpense: 0,
          });
        }
      } else if (durationDays < 24) {
        let current = start;
        while (current.getTime() <= end.getTime()) {
          const next = addDays(current, 1);
          const bucketEndDate = next.getTime() <= end.getTime() ? next : current;
          const bucketEnd = new Date(bucketEndDate);
          bucketEnd.setHours(23, 59, 59, 999);
          const sameDay = format(current, 'yyyy-MM-dd') === format(bucketEnd, 'yyyy-MM-dd');
          const name = sameDay
            ? format(current, 'MM-dd')
            : `${format(current, 'MM-dd')} ~ ${format(bucketEnd, 'MM-dd')}`;
          buckets.push({
            name,
            start: current,
            end: bucketEnd,
            totalIncome: 0,
            totalExpense: 0,
          });
          current = addDays(current, 2);
        }
      } else {
        const totalDuration = durationDays;
        const bucketSize = totalDuration / 12;
        for (let i = 0; i < 12; i++) {
          const startTime = start.getTime() + i * bucketSize * 24 * 60 * 60 * 1000;
          const endTime = start.getTime() + (i + 1) * bucketSize * 24 * 60 * 60 * 1000 - 1;
          const bucketStart = new Date(startTime);
          const bucketEnd = new Date(endTime);
          const sameDay = format(bucketStart, 'yyyy-MM-dd') === format(bucketEnd, 'yyyy-MM-dd');
          const name = sameDay
            ? format(bucketStart, 'MM-dd')
            : `${format(bucketStart, 'MM-dd')} ~ ${format(bucketEnd, 'MM-dd')}`;
          buckets.push({
            name,
            start: bucketStart,
            end: bucketEnd,
            totalIncome: 0,
            totalExpense: 0,
          });
        }
      }
    } else {
      const totalDuration = durationDays;
      const bucketSize = totalDuration / 12;
      for (let i = 0; i < 12; i++) {
        const startTime = start.getTime() + i * bucketSize * 24 * 60 * 60 * 1000;
        const endTime = start.getTime() + (i + 1) * bucketSize * 24 * 60 * 60 * 1000 - 1;
        const bucketStart = new Date(startTime);
        const bucketEnd = new Date(endTime);
        let name = '';
        if (range === '1year') {
          name = format(bucketStart, 'MMM');
        } else {
          const sameDay = format(bucketStart, 'yyyy-MM-dd') === format(bucketEnd, 'yyyy-MM-dd');
          name = sameDay
            ? format(bucketStart, 'MM-dd')
            : `${format(bucketStart, 'MM-dd')} ~ ${format(bucketEnd, 'MM-dd')}`;
        }
        buckets.push({
          name,
          start: bucketStart,
          end: bucketEnd,
          totalIncome: 0,
          totalExpense: 0,
        });
      }
    }
    
    transactions.forEach(t => {
        const tDate = toLocalMidnight(t.date);
        const tTime = tDate.getTime(); 
        const tCenter = tTime + 12 * 60 * 60 * 1000;
        
        if (tCenter >= start.getTime() && tCenter <= end.getTime()) {
             const bucket = buckets.find(b => tCenter >= b.start.getTime() && tCenter <= b.end.getTime());
             if (bucket) {
                if (t.type === 'income') {
                    bucket.totalIncome += t.amount;
                } else {
                    bucket.totalExpense += t.amount;
                    const current = typeof bucket[t.category] === 'number' ? (bucket[t.category] as number) : 0;
                    bucket[t.category] = current + t.amount;
                }
            }
        }
    });
    
    return buckets;
  }, [transactions, range, customStart, customEnd]);
  
  const toggleCategory = (entry: { value: string }) => {
      const name = entry.value;
      if (hiddenCategories.includes(name)) {
          setHiddenCategories(prev => prev.filter(c => c !== name));
      } else {
          setHiddenCategories(prev => [...prev, name]);
      }
  };

  const barKeys = useMemo(() => {
      const keys = new Set<string>();
      barData.forEach(b => Object.keys(b).forEach(k => {
          if (k !== 'name' && k !== 'start' && k !== 'end' && k !== 'totalIncome' && k !== 'totalExpense') {
              keys.add(k);
          }
      }));
      return Array.from(keys).filter(k => !hiddenCategories.includes(k));
  }, [barData, hiddenCategories]);

  return (
    <div className="flex flex-col h-full">
        <div className="flex justify-between mb-2">
            <div className="flex gap-2">
                {(['12days', '3months', '1year', 'custom'] as Range[]).map(r => (
                    <button 
                        key={r}
                        onClick={() => setRange(r)}
                        className={`px-3 py-1 rounded text-sm ${range === r ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                    >
                        {r === '12days' ? '12 Days' : r === '3months' ? '3 Months' : r === '1year' ? '1 Year' : 'Custom'}
                    </button>
                ))}
            </div>
            <div className="flex items-center gap-2">
                {range === 'custom' && (
                  <>
                    <input
                      type="date"
                      value={customStart}
                      onChange={e => setCustomStart(e.target.value)}
                      className="border rounded px-2 py-1 text-xs"
                    />
                    <span className="text-xs text-gray-500">~</span>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={e => setCustomEnd(e.target.value)}
                      className="border rounded px-2 py-1 text-xs"
                    />
                  </>
                )}
            </div>
        </div>
        
        <div className="flex-1 w-full min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Legend onClick={toggleCategory}/>
                    {barKeys.map(key => (
                        <Bar key={key} dataKey={key} stackId="a" fill={colorMap[key] || '#ccc'} />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </div>
    </div>
  );
}
