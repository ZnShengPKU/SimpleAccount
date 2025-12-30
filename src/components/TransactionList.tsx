import { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import { ChevronDown, ChevronRight, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Transaction, Category } from '../types/db';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const monthLabel = (year: number, month: number, language: 'en' | 'zh') => {
  const date = new Date(year, month - 1, 1);
  return language === 'zh' ? `${month}月` : format(date, 'MMM');
};

export default function TransactionList() {
  const { transactions, categories, deleteTransaction, updateTransaction, currentYear, currentMonth, language } = useStore();
  
  // Grouping
  const grouped = useMemo(() => {
    const years: Record<number, Record<number, Transaction[]>> = {};
    
    transactions.forEach(t => {
      const d = new Date(t.date);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      
      if (!years[y]) years[y] = {};
      if (!years[y][m]) years[y][m] = [];
      
      years[y][m].push(t);
    });
    
    return years;
  }, [transactions]);
  
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Auto expand current year/month on load
  useEffect(() => {
      const newExpanded = new Set<string>();
      newExpanded.add(currentYear.toString());
      newExpanded.add(`${currentYear}-${currentMonth}`);
      setExpanded(newExpanded);
  }, [currentYear, currentMonth]); 
  
  const toggle = (key: string) => {
      const newSet = new Set(expanded);
      if (newSet.has(key)) newSet.delete(key);
      else newSet.add(key);
      setExpanded(newSet);
  };

  // Helper to generate pie data for a list of transactions
  const getPieData = (txs: Transaction[], type: 'expense' | 'income') => {
      const data: Record<string, number> = {};
      txs.filter(t => t.type === type).forEach(t => {
          data[t.category] = (data[t.category] || 0) + t.amount;
      });
      return Object.entries(data)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value); 
  };
  
  const renderPieChart = (title: string, data: {name: string, value: number}[], total: number) => {
      if (data.length === 0) return null;
      
      return (
          <div className="flex-1 min-w-[300px] flex items-start border-r last:border-0 pr-4 mr-4 last:mr-0 last:pr-0">
             <div className="w-32 h-32 flex-shrink-0 relative">
                 <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                         <Pie 
                             data={data} 
                             dataKey="value" 
                             nameKey="name" 
                             cx="50%" 
                             cy="50%" 
                             outerRadius={50} 
                             innerRadius={25}
                             paddingAngle={2}
                         >
                             {data.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={getColor(entry.name)} stroke="none" />
                             ))}
                         </Pie>
                         <Tooltip 
                             formatter={(value: number) => value.toFixed(2)}
                             contentStyle={{ fontSize: '12px', padding: '4px' }}
                         />
                     </PieChart>
                 </ResponsiveContainer>
                 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                     <span className="text-[10px] font-bold text-gray-400">{title}</span>
                 </div>
             </div>
             <div className="flex-1 ml-4 overflow-y-auto max-h-32 text-xs">
                 <table className="w-full">
                     <tbody>
                         {data.map((entry) => (
                             <tr key={entry.name} className="border-b last:border-0 border-gray-100">
                                 <td className="py-1 flex items-center gap-2">
                                     <div className="w-2 h-2 rounded-full" style={{backgroundColor: getColor(entry.name)}}/>
                                     {entry.name}
                                 </td>
                                 <td className="py-1 text-right font-mono">{entry.value.toFixed(2)}</td>
                                 <td className="py-1 text-right text-gray-400 w-10">{total > 0 ? ((entry.value / total) * 100).toFixed(0) : 0}%</td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
          </div>
      );
  };

  const getColor = (name: string) => categories.find(c => c.name === name)?.color || '#999';
  
  return (
    <div className="w-full pb-10">
        {Object.keys(grouped).sort((a,b) => Number(b) - Number(a)).map(yearStr => {
            const year = Number(yearStr);
            const months = grouped[year];
            const isYearExpanded = expanded.has(yearStr);
            
            const yearTotalIncome = Object.values(months).flat().filter(t=>t.type==='income').reduce((a,b)=>a+b.amount,0);
            const yearTotalExpense = Object.values(months).flat().filter(t=>t.type==='expense').reduce((a,b)=>a+b.amount,0);

            return (
                <div key={year} className="mb-2 border rounded shadow-sm bg-white">
                    <div 
                        className="flex items-center justify-between p-3 bg-gray-100 cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => toggle(yearStr)}
                    >
                        <div className="flex items-center gap-2 font-bold text-lg">
                            {isYearExpanded ? <ChevronDown size={20}/> : <ChevronRight size={20}/>}
                            {year}
                        </div>
                        <div className="text-sm text-gray-600 font-mono">
                            <span className="text-green-600 mr-4">
                              {language === 'zh' ? '收入: +' : 'In: +'}
                              {yearTotalIncome.toFixed(2)}
                            </span>
                            <span className="text-red-600">
                              {language === 'zh' ? '支出: -' : 'Out: -'}
                              {yearTotalExpense.toFixed(2)}
                            </span>
                        </div>
                    </div>
                    
                    {isYearExpanded && (
                        <div className="p-2">
                            {Object.keys(months).sort((a,b) => Number(b) - Number(a)).map(monthStr => {
                                const month = Number(monthStr);
                                const txs = months[month];
                                const key = `${year}-${month}`;
                                const isMonthExpanded = expanded.has(key);
                                
                                const monthTotalIncome = txs.filter(t=>t.type==='income').reduce((a,b)=>a+b.amount,0);
                                const monthTotalExpense = txs.filter(t=>t.type==='expense').reduce((a,b)=>a+b.amount,0);
                                const expensePieData = getPieData(txs, 'expense');
                                const incomePieData = getPieData(txs, 'income');

                                return (
                                    <div key={month} className="mt-2 border border-gray-200 rounded overflow-hidden">
                                        <div 
                                            className="flex items-center justify-between p-2 bg-gray-50 cursor-pointer hover:bg-gray-100 select-none"
                                            onClick={() => toggle(key)}
                                        >
                                            <div className="flex items-center gap-2 font-medium">
                                                {isMonthExpanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                                                {monthLabel(year, month, language)}
                                            </div>
                                            <div className="text-xs text-gray-500 font-mono">
                                                <span className="text-green-600 mr-3">
                                                  {language === 'zh' ? '收入: +' : 'In: +'}
                                                  {monthTotalIncome.toFixed(2)}
                                                </span>
                                                <span className="text-red-600">
                                                  {language === 'zh' ? '支出: -' : 'Out: -'}
                                                  {monthTotalExpense.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {isMonthExpanded && (
                                            <div className="bg-white">
                                                {/* Embedded Pie Charts for Month */}
                                                {(expensePieData.length > 0 || incomePieData.length > 0) && (
                                                    <div className="flex p-4 border-b bg-slate-50 justify-center flex-wrap">
                                                        {renderPieChart('EXP', expensePieData, monthTotalExpense)}
                                                        {renderPieChart('INC', incomePieData, monthTotalIncome)}
                                                    </div>
                                                )}
                                                
                                                {/* Daily Grouping */}
                                                {(() => {
                                                    const days: Record<string, Transaction[]> = {};
                                                    txs.forEach(t => {
                                                        const dateKey = t.date;
                                                        if (!days[dateKey]) days[dateKey] = [];
                                                        days[dateKey].push(t);
                                                    });
                                                    
                                                    const sortedDays = Object.keys(days).sort((a,b) => b.localeCompare(a));
                                                    
                                                    return (
                                                        <div className="bg-white">
                                                            {sortedDays.map(dateKey => {
                                                                const dayTxs = days[dateKey];
                                                                const dayTotalIn = dayTxs.filter(t=>t.type==='income').reduce((a,b)=>a+b.amount,0);
                                                                const dayTotalOut = dayTxs.filter(t=>t.type==='expense').reduce((a,b)=>a+b.amount,0);
                                                                const dayDate = new Date(dateKey);
                                                                const dayKey = dateKey;
                                                                const isDayExpanded = expanded.has(dayKey);

                                                                return (
                                                                    <div key={dateKey} className="border-b last:border-0">
                                                                        <div 
                                                                            className="flex items-center justify-between px-4 py-2 bg-gray-50/50 cursor-pointer hover:bg-gray-100"
                                                                            onClick={() => toggle(dayKey)}
                                                                        >
                                                                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                                                                {isDayExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                                                                                <span>{format(dayDate, 'MM-dd')}</span>
                                                                                <span className="text-gray-400 font-normal ml-1">{format(dayDate, 'EEEE')}</span>
                                                                            </div>
                                                                            <div className="text-xs font-mono text-gray-500">
                                                                                 {dayTotalIn > 0 && <span className="text-green-600 mr-2">+{dayTotalIn.toFixed(2)}</span>}
                                                                                 {dayTotalOut > 0 && <span className="text-red-600">-{dayTotalOut.toFixed(2)}</span>}
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        {isDayExpanded && (
                                                                            <table className="w-full text-sm">
                                                                                <tbody>
                                                                                    {dayTxs.sort((a,b) => b.id - a.id).map(tx => (
                                                                                        <TransactionRow 
                                                                                            key={tx.id} 
                                                                                            tx={tx} 
                                                                                            categories={categories}
                                                                                            onEdit={updateTransaction}
                                                                                            onDelete={deleteTransaction}
                                                                                        />
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        })}
    </div>
  );
}

function TransactionRow({ tx, categories, onEdit, onDelete }: { 
    tx: Transaction; 
    categories: Category[]; 
    onEdit: (tx: Transaction) => void; 
    onDelete: (id: number) => void; 
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [tempTx, setTempTx] = useState(tx);
    
    useEffect(() => { setTempTx(tx); }, [tx]);

    const handleSave = () => {
        onEdit(tempTx);
        setIsEditing(false);
    };

    const handleDelete = () => {
        const { language } = useStore.getState();
        const message = language === 'zh'
          ? '确定要删除这条记录吗？'
          : 'Are you sure you want to delete this record?';
        if (confirm(message)) {
            onDelete(tx.id);
        }
    };

    if (isEditing) {
        return (
            <tr className="bg-blue-50">
                <td className="p-2 pl-4"><input type="date" value={tempTx.date} onChange={e=>setTempTx({...tempTx, date: e.target.value})} className="border rounded p-1 w-full text-xs"/></td>
                <td className="p-2">
                    <select 
                        value={tempTx.category} 
                        onChange={e => {
                            const selected = categories.find(c => c.name === e.target.value);
                            setTempTx({
                                ...tempTx,
                                category: e.target.value,
                                type: selected ? selected.type : tempTx.type,
                            });
                        }} 
                        className="border rounded p-1 w-full text-xs"
                    >
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                </td>
                <td className="p-2"><input type="number" value={tempTx.amount} onChange={e=>setTempTx({...tempTx, amount: parseFloat(e.target.value)})} className="border rounded p-1 w-full text-xs"/></td>
                <td className="p-2"><input type="text" value={tempTx.note} onChange={e=>setTempTx({...tempTx, note: e.target.value})} className="border rounded p-1 w-full text-xs"/></td>
                <td className="p-2 flex gap-1">
                    <button onClick={handleSave} className="text-green-600 hover:text-green-800 text-xs font-bold">Save</button>
                    <button onClick={()=>setIsEditing(false)} className="text-gray-600 hover:text-gray-800 text-xs">Cancel</button>
                </td>
            </tr>
        );
    }

    return (
        <tr className="hover:bg-gray-50 border-b last:border-0 group transition-colors" onDoubleClick={() => setIsEditing(true)}>
            <td className="p-2 pl-4 text-gray-600 w-24">{format(new Date(tx.date), 'MM-dd')}</td>
            <td className="p-2 w-32">
                <span 
                    className={`px-2 py-0.5 rounded text-xs text-white truncate block text-center`}
                    style={{ backgroundColor: categories.find(c=>c.name===tx.category)?.color || '#999' }}
                >
                    {tx.category}
                </span>
            </td>
            <td className={`p-2 font-mono w-28 text-right ${tx.type==='income' ? 'text-green-600' : 'text-red-600'}`}>
                {tx.type==='income' ? '+' : '-'}{tx.amount.toFixed(2)}
            </td>
            <td className="p-2 text-gray-700">
                <div className="flex items-center gap-2">
                    <span>{tx.note}</span>
                    {/* If we had explicit subcategory field, display it here */}
                </div>
            </td>
            <td className="p-2 w-20">
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setIsEditing(true)} className="text-blue-500 hover:text-blue-700"><Edit2 size={16}/></button>
                    <button onClick={handleDelete} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                </div>
            </td>
        </tr>
    );
}
