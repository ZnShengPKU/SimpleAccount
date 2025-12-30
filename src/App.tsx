import { useEffect } from 'react';
import { useStore } from './store';
import AddRecord from './components/AddRecord';
import Charts from './components/Charts';
import TransactionList from './components/TransactionList';

function App() {
  const { fetchData } = useStore();

  useEffect(() => {
    fetchData();
    
    // Check backup reminder
    const lastBackup = localStorage.getItem('lastBackupDate');
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${today.getMonth() + 1}`;
    
    if (lastBackup !== currentMonth) {
       setTimeout(() => {
           const msg = useStore.getState().language === 'zh'
             ? '每月备份提醒：建议备份你的数据，现在要导出吗？'
             : 'Monthly Backup Reminder: It is recommended to back up your data. Do you want to export now?';
           if (confirm(msg)) {
               useStore.getState().exportData();
               localStorage.setItem('lastBackupDate', currentMonth);
           } else {
               localStorage.setItem('lastBackupDate', currentMonth);
           }
       }, 1000);
    }
  }, [fetchData]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      {/* Top Area: Add Record & Tools */}
      <div className="flex-none bg-white shadow-sm z-10">
        <AddRecord />
      </div>
      
      {/* Middle Area: Charts */}
      {/* Requirement: "Charts occupy 60% height" (of the visualization area). 
          "Middle chart visualization area".
          Let's give it fixed height or flex.
          If I use flex-1 for List, Charts can be fixed height or flex-1.
          "Window size adjustment... charts auto scale".
          Let's make Charts area resizable or just fixed percentage of screen?
          Fixed height is easier to manage scrolling of list.
          Let's say 45% of screen height.
      */}
      <div className="flex-none p-4 h-[45vh] min-h-[350px] bg-gray-50 border-b border-gray-200">
        <Charts />
      </div>
      
      {/* Bottom Area: List */}
      <div className="flex-1 overflow-y-auto bg-white p-4">
        <TransactionList />
      </div>
    </div>
  );
}
export default App;
