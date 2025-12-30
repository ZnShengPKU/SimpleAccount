import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { api } from '../api/db';
import { Plus, Download, Upload } from 'lucide-react';
import { format } from 'date-fns';

export default function AddRecord() {
  const { categories, addTransaction, addCategory, deleteCategory, exportData, importData, language, setLanguage } = useStore();
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [categoryId, setCategoryId] = useState<string>('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [hints, setHints] = useState<string[]>([]);
  const [showHints, setShowHints] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
          importData(e.target.files[0]);
          e.target.value = ''; // Reset
      }
  };
  
  const typeCategories = categories.filter(c => c.type === type);
  
  useEffect(() => {
    if (typeCategories.length > 0) {
        const exists = typeCategories.find(c => String(c.id) === categoryId);
        if (!exists) {
            setCategoryId(String(typeCategories[0].id));
        }
    } else {
        setCategoryId('');
    }
  }, [type, categories, categoryId]);
  
  const currentCategoryName = categories.find(c => String(c.id) === categoryId)?.name || '';

  useEffect(() => {
    if (currentCategoryName) {
      api.getSubcategoryHints(currentCategoryName).then(setHints);
    } else {
        setHints([]);
    }
  }, [currentCategoryName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !amount) return;
    const numeric = Math.abs(parseFloat(amount));
    if (!numeric) return;
    
    await addTransaction({
      type,
      category: currentCategoryName,
      subcategory: note, 
      date,
      amount: numeric,
      note
    });
    
    setAmount('');
    setNote('');
  };

  const handleAddCategory = async (e: React.FormEvent) => {
      e.preventDefault();
      const name = newCatName.trim();
      if (!name) return;
      try {
          const newCat = await addCategory(name, type);
          setNewCatName('');
          setCategoryId(String(newCat.id));
          setShowCatModal(false);
      } catch (error) {
          const message = (error as Error).message || 'Failed to add category';
          alert(message);
      }
  };
  
  return (
    <div className="p-4 border-b bg-white">
        <form onSubmit={handleSubmit} className="flex items-center gap-4 flex-wrap">
        <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">{language === 'zh' ? '类型' : 'Type'}</label>
            <select 
                value={type} 
                onChange={e => setType(e.target.value as 'expense' | 'income')}
                className="p-2 border rounded bg-white"
            >
                <option value="expense">{language === 'zh' ? '支出' : 'Expense'}</option>
                <option value="income">{language === 'zh' ? '收入' : 'Income'}</option>
            </select>
        </div>
        
        <div className="flex flex-col relative">
            <label className="text-xs text-gray-500 mb-1 flex justify-between">
                {language === 'zh' ? '分类' : 'Category'}
                <button type="button" onClick={() => setShowCatModal(true)} className="text-blue-500 hover:underline text-xs">
                  {language === 'zh' ? '管理' : 'Manage'}
                </button>
            </label>
            <select 
                value={categoryId} 
                onChange={e => setCategoryId(e.target.value)}
                className="p-2 border rounded w-40 bg-white"
            >
                {typeCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
        </div>

        <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">{language === 'zh' ? '日期' : 'Date'}</label>
            <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)}
                className="p-2 border rounded bg-white"
            />
        </div>
        
        <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">{language === 'zh' ? '金额' : 'Amount'}</label>
            <input 
                type="number" 
                inputMode="decimal"
                min="0"
                step="0.01" 
                placeholder="0.00"
                value={amount}
                onChange={e => {
                    const v = e.target.value.replace(/-/g, '');
                    setAmount(v);
                }}
                className="p-2 border rounded w-32"
            />
        </div>
        
        <div className="flex flex-col relative">
            <label className="text-xs text-gray-500 mb-1">
              {language === 'zh' ? '备注 / 子类' : 'Note / Subcategory'}
            </label>
            <input 
                type="text" 
                placeholder={language === 'zh' ? '备注' : 'Note'}
                value={note}
                onChange={e => setNote(e.target.value)}
                onFocus={() => setShowHints(true)}
                onBlur={() => setTimeout(() => setShowHints(false), 200)}
                className="p-2 border rounded w-64"
            />
            {showHints && hints.length > 0 && (
            <div className="absolute top-[60px] left-0 w-full bg-white border shadow-lg z-50 rounded max-h-40 overflow-auto">
                {hints.map(h => (
                <div 
                    key={h} 
                    className="flex items-center justify-between px-2 py-1 hover:bg-gray-100 text-sm"
                >
                    <button
                        type="button"
                        className="flex-1 text-left"
                        onClick={() => setNote(h)}
                    >
                        {h}
                    </button>
                    <button
                        type="button"
                        className="ml-2 text-xs text-gray-400 hover:text-red-500"
                        onClick={async (e) => {
                            e.stopPropagation();
                            setHints(prev => prev.filter(x => x !== h));
                            if (!currentCategoryName) return;
                            try {
                                await api.deleteSubcategoryHint(currentCategoryName, h);
                            } catch (error) {
                                console.error('deleteSubcategoryHint failed', error);
                            }
                        }}
                    >
                        删除
                    </button>
                </div>
                ))}
            </div>
            )}
        </div>
        
        <div className="flex items-end gap-2 ml-auto h-[62px] pb-[1px]">
            <div className="flex items-center gap-1 mr-3 text-xs">
              <button
                type="button"
                onClick={() => setLanguage('zh')}
                className={`px-2 py-1 rounded ${language === 'zh' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                中
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 rounded ${language === 'en' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                EN
              </button>
            </div>
            <button type="submit" className="bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 h-[42px] px-6">
                <Plus size={18} /> {language === 'zh' ? '新增' : 'Add'}
            </button>
            <div className="flex gap-1 ml-2 border-l pl-2">
                 <button
                    type="button"
                    onClick={() => exportData()}
                    title={language === 'zh' ? '导出数据' : 'Export Data'}
                    className="text-gray-600 hover:bg-gray-100 rounded h-[42px] w-[42px] flex items-center justify-center border"
                >
                    <Upload size={20}/>
                </button>
                 <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title={language === 'zh' ? '导入数据' : 'Import Data'}
                    className="text-gray-600 hover:bg-gray-100 rounded h-[42px] w-[42px] flex items-center justify-center border"
                >
                    <Download size={20}/>
                </button>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".json"/>
        </div>
        </form>

        {/* Category Modal */}
        {showCatModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded shadow-lg w-96">
                    <h3 className="text-lg font-bold mb-4">
                      {language === 'zh' ? '管理分类' : 'Manage Categories'} (
                      {language === 'zh'
                        ? type === 'expense'
                          ? '支出'
                          : '收入'
                        : type === 'expense'
                          ? 'Expense'
                          : 'Income'}
                      )
                    </h3>
                    <ul className="max-h-60 overflow-y-auto mb-4 border rounded">
                        {typeCategories.map(c => (
                            <li key={c.id} className="flex justify-between items-center p-2 border-b last:border-0">
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 rounded-full" style={{backgroundColor: c.color}}></span>
                                    {c.name}
                                </span>
                                <button 
                                    onClick={() => {
                                        const message = language === 'zh'
                                          ? `确定要删除分类 "${c.name}" 吗？`
                                          : `Delete category "${c.name}"?`;
                                        if (confirm(message)) deleteCategory(c.id);
                                    }} 
                                    className="text-red-500 hover:text-red-700 text-sm"
                                >
                                    {language === 'zh' ? '删除' : 'Delete'}
                                </button>
                            </li>
                        ))}
                    </ul>
                    <form onSubmit={handleAddCategory} className="flex gap-2">
                        <input 
                            value={newCatName}
                            onChange={e => setNewCatName(e.target.value)}
                            placeholder={language === 'zh' ? '新分类名称' : 'New Category Name'}
                            className="border p-2 rounded flex-1"
                        />
                        <button type="submit" disabled={!newCatName.trim()} className="bg-green-600 text-white p-2 rounded disabled:opacity-50">
                          {language === 'zh' ? '新增' : 'Add'}
                        </button>
                    </form>
                    <button onClick={() => setShowCatModal(false)} className="mt-4 text-gray-500 hover:text-gray-700 w-full text-center">
                      {language === 'zh' ? '关闭' : 'Close'}
                    </button>
                </div>
            </div>
        )}
    </div>
  );
}
