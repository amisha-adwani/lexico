import { useState } from "react";
import "./App.css";
import AppLayout from "./components/layout/AppLayout";
import InputPanel from "./components/panels/InputPanel";
import ViewSwitcher from "./components/viewRenderers/viewSwitcher";

function App() {
  const [inputText, setInputText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [apiResponse, setApiResponse] = useState(null);


  const handleSimplify = async () => {
    const trimmedText = inputText.trim();
    if ((!trimmedText && !selectedFile) || isLoading) return;

    setIsLoading(true);
    setErrorMessage("");
    setApiResponse(null);

    try {
      const payload = selectedFile ? new FormData() : null;

      if (payload) {
        payload.append("file", selectedFile);

        if (trimmedText) {
          payload.append("text", trimmedText);
        }

        payload.append("includeAllViews", "true");
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/simplify/canonical`,
        {
          method: "POST",
          ...(payload
            ? { body: payload }
            : {
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  text: trimmedText,
                  includeAllViews: true,
                }),
              }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to simplify text.");
      }
      if (!data?.recommendedView) {
        throw new Error("Invalid canonical response");
      }

      setApiResponse(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to simplify text.";
      setErrorMessage(message);
      setApiResponse(null);
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
        <ViewSwitcher
          recommendedView={apiResponse?.recommendedView}
          rankedViews={apiResponse?.rankedViews}
          allViews={apiResponse?.allViews}
          viewModel={apiResponse?.viewModel}
          isLoading={isLoading}
          errorMessage={errorMessage}
        />
      }
    />
  );
}

export default App;
