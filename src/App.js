import { useMemo, useState } from 'react';
import AppLayout from './components/layout/AppLayout';
import InputPanel from './components/panels/InputPanel';
import OutputRenderer from './components/output/OutputRenderer';
import { mockAiOutput } from './data/mockOutput';

function App() {
  const [inputText, setInputText] = useState('');
  const [outputBlocks, setOutputBlocks] = useState(mockAiOutput);

  const title = useMemo(() => {
    if (!inputText.trim()) {
      return 'Ready to simplify';
    }
    return 'Simplification preview';
  }, [inputText]);

  const handleSimplify = () => {
    setOutputBlocks(mockAiOutput);
  };

  return (
    <AppLayout
      inputPanel={
        <InputPanel
          value={inputText}
          onChange={setInputText}
          onSimplify={handleSimplify}
        />
      }
      outputPanel={<OutputRenderer blocks={outputBlocks} title={title} />}
    />
  );
}

export default App;
