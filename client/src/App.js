import { useMemo, useState } from 'react';
import AppLayout from './components/layout/AppLayout';
import InputPanel from './components/panels/InputPanel';
import OutputRenderer from './components/output/OutputRenderer';

function App() {
  const [inputText, setInputText] = useState('');
  const [outputBlocks, setOutputBlocks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const title = useMemo(() => {
    if (isLoading) {
      return 'Analyzing your text...';
    }
    if (errorMessage) {
      return errorMessage;
    }
    if (!inputText.trim()) {
      return 'Ready to simplify';
    }
    return 'Analysis and summary';
  }, [inputText, isLoading, errorMessage]);

  const handleSimplify = async () => {
    const trimmedText = inputText.trim();
    if (!trimmedText || isLoading) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/simplify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: trimmedText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to simplify text.');
      }

      if (!Array.isArray(data?.blocks)) {
        throw new Error('Server returned an invalid format.');
      }

      setOutputBlocks(data.blocks);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to simplify text.';
      setErrorMessage(message);
      setOutputBlocks([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout
      inputPanel={
        <InputPanel
          value={inputText}
          onChange={setInputText}
          onSimplify={handleSimplify}
          isLoading={isLoading}
        />
      }
      outputPanel={<OutputRenderer blocks={outputBlocks} title={title} />}
    />
  );
}

export default App;
