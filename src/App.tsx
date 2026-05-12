import { useState } from 'react';
import { Tabs, type TabItem } from './components/common/Tabs';
import { LayerOnePage } from './routes/LayerOnePage';
import { LayerTwoPage } from './routes/LayerTwoPage';

const TABS: TabItem[] = [
  { id: 'layer-one', label: 'Inside the Network', hint: 'Layer 1' },
  { id: 'layer-two', label: 'Finding the Document', hint: 'Layer 2' },
];

function App() {
  const [activeTab, setActiveTab] = useState<string>(TABS[0].id);

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
          <Tabs tabs={TABS} activeId={activeTab} onChange={setActiveTab}>
            {activeTab === 'layer-one' ? <LayerOnePage /> : <LayerTwoPage />}
          </Tabs>
        </div>
      </main>
    </div>
  );
}

export default App;
