import { useState } from "react";

export default function App() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState("safe");

  const cleanText = () => {
  let cleaned = input;

  // Normalize line endings
  cleaned = cleaned.replace(/\r\n/g, "\n");

  // Remove zero-width chars
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, "");

  // SAFE MODE
  if (mode === "safe") {

    // Replace tabs with 4 spaces
    cleaned = cleaned.replace(/\t/g, "    ");

    // Remove trailing spaces ONLY
    cleaned = cleaned.replace(/[ \t]+$/gm, "");

    // Collapse huge empty gaps
    cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  }

  // AGGRESSIVE MODE
  else {

    // Replace tabs
    cleaned = cleaned.replace(/\t/g, " ");

    // Compress spaces
    cleaned = cleaned.replace(/[ ]{2,}/g, " ");

    // Remove spaces around newlines
    cleaned = cleaned.replace(/ *\n */g, "\n");

    const lines = cleaned.split("\n");

    let merged = "";

    for (let i = 0; i < lines.length; i++) {
      const current = lines[i].trim();
      const next = lines[i + 1]?.trim();

      if (!current) {
        merged += "\n\n";
        continue;
      }

      const endsProperly = /[.!?:]$/.test(current);

      if (next && !endsProperly) {
        merged += current + " ";
      } else {
        merged += current + "\n";
      }
    }

    cleaned = merged;

    // Collapse excessive empty lines
    cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  }

  cleaned = cleaned.trim();

  setOutput(cleaned);
  };

  const copyText = async () => {
    if (!output) return;

    await navigator.clipboard.writeText(output);

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const clearAll = () => {
    setInput("");
    setOutput("");
  };

  const wordCount = output
    ? output.trim().split(/\s+/).length
    : 0;

  const charCount = output.length;

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-5">
      <div className="w-full max-w-5xl">
        <h1 className="text-4xl font-bold mb-2">
          CleanPaste
        </h1>

        <p className="text-zinc-400 mb-6">
          Clean messy copied text instantly.
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Input */}
          <textarea
            placeholder="Paste messy text here..."
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 h-80 outline-none resize-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />

          {/* Output */}
          <textarea
            placeholder="Cleaned output..."
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 h-80 outline-none resize-none"
            value={output}
            readOnly
          />
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={() => setMode("safe")}
            className={`px-4 py-2 rounded-xl transition ${
              mode === "safe"
                ? "bg-white text-black"
                : "bg-zinc-800"
            }`}
          >
            Safe Mode
          </button>

          <button
            onClick={() => setMode("aggressive")}
            className={`px-4 py-2 rounded-xl transition ${
              mode === "aggressive"
                ? "bg-white text-black"
                : "bg-zinc-800"
            }`}
          >
            Aggressive Mode
          </button>
        </div>
        <div className="mt-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm text-zinc-300">
          {mode === "safe" ? (
            <div>
              <p className="font-semibold text-white mb-1">
                Safe Mode
              </p>

              <p>
                Best for code, lists, notes, and formatted text.
              </p>
            </div>
          ) : (
            <div>
              <p className="font-semibold text-white mb-1">
                Aggressive Mode
              </p>

              <p>
                Best for paragraphs copied from PDFs or websites.
              </p>
            </div>
          )}
        </div>
        {/* Buttons */}
        <div className="flex flex-wrap gap-3 mt-5">
          <button
            onClick={cleanText}
            className="bg-white text-black px-5 py-2 rounded-xl font-medium hover:opacity-90 transition"
          >
            Clean Text
          </button>

          <button
            onClick={copyText}
            className="bg-zinc-800 px-5 py-2 rounded-xl hover:bg-zinc-700 transition"
          >
            {copied ? "Copied ✓" : "Copy Output"}
          </button>

          <button
            onClick={clearAll}
            className="bg-red-500/20 text-red-400 px-5 py-2 rounded-xl hover:bg-red-500/30 transition"
          >
            Clear
          </button>
        </div>

        {/* Stats */}
        <div className="flex gap-6 mt-6 text-zinc-400 text-sm">
          <p>Words: {wordCount}</p>
          <p>Characters: {charCount}</p>
        </div>
      </div>
    </div>
  );
}