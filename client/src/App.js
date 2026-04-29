import { useMemo, useState } from 'react';
import AppLayout from './components/layout/AppLayout';
import InputPanel from './components/panels/InputPanel';
import OutputRenderer from './components/output/OutputRenderer';
import { exportBlocksToPdf } from './utils/pdfExport';

function App() {
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [outputBlocks, setOutputBlocks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const hasInput = Boolean(inputText.trim() || selectedFile);

  const title = useMemo(() => {
    if (isLoading) {
      return 'Analyzing your text...';
    }
    if (errorMessage) {
      return errorMessage;
    }
    if (!hasInput) {
      return 'Ready to simplify';
    }
    return 'Analysis and summary';
  }, [hasInput, isLoading, errorMessage]);

  const handleSimplify = async () => {
    const trimmedText = inputText.trim();
    if ((!trimmedText && !selectedFile) || isLoading) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      let response;

      if (selectedFile) {
        const payload = new FormData();
        payload.append('file', selectedFile);
        if (trimmedText) {
          payload.append('text', trimmedText);
        }

        response = await fetch('/api/simplify', {
          method: 'POST',
          body: payload,
        });
      } else {
        response = await fetch('/api/simplify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: trimmedText }),
        });
      }

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
          selectedFile={selectedFile}
          onFileSelect={setSelectedFile}
          onSimplify={handleSimplify}
          isLoading={isLoading}
        />
      }
      outputPanel={
        <OutputRenderer
          blocks={outputBlocks}
          title={title}
          onExport={exportBlocksToPdf}
          isExporting={isExporting}
        />
      }
    />
  );
}

export default App;
