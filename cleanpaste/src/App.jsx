import { useState, useEffect, useMemo, useCallback } from "react";
import * as diff from "diff";
import {
  Sparkles,
  Copy,
  Check,
  Trash2,
  SlidersHorizontal,
  Eye,
  FileCode,
  Shield,
  Zap,
  BookOpen,
  FileText,
  Clock,
  Scissors,
  Layers,
  ArrowRightLeft,
  Settings2,
  CheckCircle2,
  HelpCircle,
  X,
  Keyboard,
  History,
  Star,
  Download,
  Share2,
  Type,
  FileSpreadsheet,
  Terminal,
  Code2,
  FileJson,
  Wrench,
  Wand2
} from "lucide-react";

export default function App() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState("safe"); // 'safe' | 'aggressive' | 'code' | 'markdown' | 'terminal' | 'env'
  const [viewMode, setViewMode] = useState("output"); // 'output' | 'diff'
  const [toast, setToast] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [detectedFormat, setDetectedFormat] = useState(null); // 'json' | 'sql' | 'env' | 'xml' | null

  // History & Favorites stored in localStorage
  const [historyItems, setHistoryItems] = useState(() => {
    try {
      const saved = localStorage.getItem("cleanpaste_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Granular settings
  const [settings, setSettings] = useState({
    removeZeroWidth: true,
    tabToSpaces: true,
    trimTrailing: true,
    collapseEmptyLines: true,
    stripHtml: false,
    stripEmojis: false,
    smartQuotesToStraight: false,
    unescapeHtmlEntities: false,
    stripAnsi: true,
    stripPrompts: true,
    stripLineNumbers: false,
    fixMalformedJson: true,
  });


  // Save history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("cleanpaste_history", JSON.stringify(historyItems));
    } catch (e) {
      console.error(e);
    }
  }, [historyItems]);


  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };


  const cleanText = useCallback(() => {
    if (!input) {
      setOutput("");
      return;
    }

    let cleaned = input;

    // Normalize line endings
    cleaned = cleaned.replace(/\r\n/g, "\n");

    // Optional: Unescape HTML Entities
    if (settings.unescapeHtmlEntities) {
      cleaned = cleaned
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
    }

    // Optional: Strip HTML Tags
    if (settings.stripHtml) {
      cleaned = cleaned.replace(/<[^>]*>/g, "");
    }

    // Optional: Strip Emojis
    if (settings.stripEmojis) {
      cleaned = cleaned.replace(
        /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
        ""
      );
    }

    // Optional: Smart Quotes to Straight Quotes
    if (settings.smartQuotesToStraight) {
      cleaned = cleaned
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2018\u2019]/g, "'");
    }

    // Remove zero-width chars
    if (settings.removeZeroWidth) {
      cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, "");
    }

    // AUTO FORMAT DETECTION
    const trimmedInput = input.trim();
    if (/^[\{\[]/.test(trimmedInput) || settings.fixMalformedJson) {
      if (/^[\{\[]/.test(trimmedInput) || (trimmedInput.includes(":") && (trimmedInput.includes("{") || trimmedInput.includes("'")))) {
        setDetectedFormat("json");
      }
    } else if (/\b(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|FROM|WHERE|JOIN)\b/i.test(trimmedInput)) {
      setDetectedFormat("sql");
    } else if (/^[A-Z0-9_]+\s*=/m.test(trimmedInput)) {
      setDetectedFormat("env");
    } else if (/^<[\s\S]*>$/.test(trimmedInput)) {
      setDetectedFormat("xml");
    } else {
      setDetectedFormat(null);
    }

    // MODE SPECIFIC CLEANING
    if (mode === "safe") {
      if (settings.tabToSpaces) {
        cleaned = cleaned.replace(/\t/g, "    ");
      }
      if (settings.trimTrailing) {
        cleaned = cleaned.replace(/[ \t]+$/gm, "");
      }
      if (settings.collapseEmptyLines) {
        cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
      }
    } else if (mode === "aggressive") {
      cleaned = cleaned.replace(/\t/g, " ");
      cleaned = cleaned.replace(/[ ]{2,}/g, " ");
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
      cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
    } else if (mode === "code") {
      cleaned = cleaned.replace(/\t/g, "  ");
      cleaned = cleaned.replace(/[ \t]+$/gm, "");
      cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
    } else if (mode === "markdown") {
      cleaned = cleaned.replace(/^(#+)\s*/gm, "$1 ");
      cleaned = cleaned.replace(/^[\*\-\+]\s*/gm, "- ");
      cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
    } else if (mode === "terminal") {
      // Strip ANSI escape codes (\x1b[..., \u001b[...)
      if (settings.stripAnsi) {
        cleaned = cleaned.replace(/[\u001b\u009b][#Selection0-9;?]*[a-zA-Z]/g, "");
        cleaned = cleaned.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, "");
      }
      // Strip bash/zsh prompts ($ , > , ps > )
      if (settings.stripPrompts) {
        cleaned = cleaned.replace(/^[\$\>\#]\s+/gm, "");
        cleaned = cleaned.replace(/^[\w\.\-]+@[\w\.\-]+:[~\w\.\-]+\$\s+/gm, "");
      }
      // Strip leading stack trace line numbers (12: , [1] )
      if (settings.stripLineNumbers) {
        cleaned = cleaned.replace(/^\s*\d+[:\|]\s*/gm, "");
        cleaned = cleaned.replace(/^\[\d+\]\s*/gm, "");
      }
      cleaned = cleaned.replace(/[ \t]+$/gm, "");
    } else if (mode === "env") {
      // Sort env keys alphabetically and clean duplicates/blank lines
      const lines = cleaned
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith("#"));

      const envMap = new Map();
      lines.forEach((line) => {
        const eqIdx = line.indexOf("=");
        if (eqIdx !== -1) {
          const key = line.substring(0, eqIdx).trim();
          const val = line.substring(eqIdx + 1).trim();
          envMap.set(key, val);
        }
      });

      const sortedKeys = Array.from(envMap.keys()).sort();
      cleaned = sortedKeys.map((k) => `${k}=${envMap.get(k)}`).join("\n");
    }

    cleaned = cleaned.trim();
    setOutput(cleaned);
  }, [input, mode, settings]);

  // Run cleanText on input or mode change automatically
  useEffect(() => {
    cleanText();
  }, [input, mode, settings, cleanText]);

  // Save entry to history automatically when output changes
  const saveToHistory = useCallback(() => {
    if (!output || output.length < 3) return;
    const newItem = {
      id: Date.now().toString(),
      input,
      output,
      mode,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      favorite: false,
    };
    setHistoryItems((prev) => {
      if (prev.length > 0 && prev[0].output === output) return prev;
      return [newItem, ...prev.slice(0, 19)];
    });
  }, [input, output, mode]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        cleanText();
        saveToHistory();
        showToast("Text cleaned and saved to history!");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cleanText, saveToHistory]);

  const copyText = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    saveToHistory();
    showToast("Copied cleaned text to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Developer Hygiene Quick Tools
  const prettifyData = () => {
    const raw = output || input;
    if (!raw) return;

    // Try JSON Prettify & Repair
    try {
      let repaired = raw;
      // Replace single quotes with double quotes around keys/strings
      repaired = repaired.replace(/'([^'\\]*(\\.[^'\\]*)*)'/g, '"$1"');
      // Fix unquoted keys: { key: "val" } -> { "key": "val" }
      repaired = repaired.replace(/([{,]\s*)([a-zA-Z0-9_$]+)\s*:/g, '$1"$2":');
      // Strip trailing commas: [1, 2,] -> [1, 2]
      repaired = repaired.replace(/,\s*([\}\]])/g, '$1');

      const parsed = JSON.parse(repaired);
      const formatted = JSON.stringify(parsed, null, 2);
      setOutput(formatted);
      showToast("Prettified & repaired JSON!");
      return;
    } catch (e) {
      // If not JSON, try basic SQL or XML formatting
      if (/\b(SELECT|INSERT|UPDATE|DELETE|CREATE|WHERE|FROM|JOIN)\b/i.test(raw)) {
        const sqlFormatted = raw
          .replace(/\s+/g, " ")
          .replace(/\b(SELECT|FROM|WHERE|LEFT JOIN|RIGHT JOIN|INNER JOIN|GROUP BY|ORDER BY|HAVING|LIMIT)\b/gi, "\n$1")
          .trim();
        setOutput(sqlFormatted);
        showToast("Prettified SQL query!");
        return;
      }
      showToast("Could not parse as JSON", "warning");
    }
  };

  const minifyData = () => {
    const raw = output || input;
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      setOutput(JSON.stringify(parsed));
      showToast("Minified JSON into single line!");
    } catch {
      // Minify generic lines
      const minified = raw.split("\n").map((l) => l.trim()).filter(Boolean).join(" ");
      setOutput(minified);
      showToast("Minified text lines!");
    }
  };

  const convertEnvToJson = () => {
    const raw = output || input;
    if (!raw) return;

    if (raw.trim().startsWith("{")) {
      // JSON -> .env
      try {
        const obj = JSON.parse(raw);
        const envStr = Object.entries(obj)
          .map(([k, v]) => `${k}=${v}`)
          .join("\n");
        setOutput(envStr);
        showToast("Converted JSON to .env!");
      } catch {
        showToast("Invalid JSON input", "warning");
      }
    } else {
      // .env -> JSON
      const lines = raw.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
      const obj = {};
      lines.forEach((l) => {
        const eqIdx = l.indexOf("=");
        if (eqIdx !== -1) {
          const k = l.substring(0, eqIdx).trim();
          const v = l.substring(eqIdx + 1).trim();
          obj[k] = v;
        }
      });
      setOutput(JSON.stringify(obj, null, 2));
      showToast("Converted .env to JSON!");
    }
  };

  const transformCase = (type) => {
    if (!output) return;
    let transformed = output;
    if (type === "upper") transformed = output.toUpperCase();
    else if (type === "lower") transformed = output.toLowerCase();
    else if (type === "title") {
      transformed = output.replace(/\b\w/g, (c) => c.toUpperCase());
    } else if (type === "slug") {
      transformed = output.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-");
    }
    setOutput(transformed);
    showToast(`Transformed text (${type})`);
  };

  const downloadFile = (filename, extension) => {
    if (!output) return;
    const element = document.createElement("a");
    const file = new Blob([output], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `${filename}.${extension}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast(`Downloaded cleanpaste.${extension}`);
  };

  const toggleFavorite = (id) => {
    setHistoryItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, favorite: !item.favorite } : item))
    );
  };

  const deleteHistoryItem = (id) => {
    setHistoryItems((prev) => prev.filter((item) => item.id !== id));
  };


  const clearAll = () => {
    setInput("");
    setOutput("");
    showToast("Cleared all text", "info");
  };

  // Difference calculation for Diff View
  const diffResult = useMemo(() => {
    if (!input || !output) return [];
    return diff.diffWordsWithSpace(input, output);
  }, [input, output]);

  // Stats calculation
  const stats = useMemo(() => {
    const origChars = input.length;
    const cleanChars = output.length;
    const charsRemoved = Math.max(0, origChars - cleanChars);

    const wordCount = output ? output.trim().split(/\s+/).filter(Boolean).length : 0;
    const lineCount = output ? output.split("\n").length : 0;
    const readingTimeMinutes = Math.ceil(wordCount / 200);

    return {
      wordCount,
      cleanChars,
      charsRemoved,
      lineCount,
      readingTimeMinutes,
    };
  }, [input, output]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white font-sans">
      {/* Background ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl"></div>
      </div>

      {/* Floating Toast */}
      {toast && (
        <div className="fixed bottom-5 left-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl glass-panel border border-indigo-500/30 text-white text-sm shadow-2xl animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="relative z-10 border-b border-zinc-800/60 bg-zinc-950/40 backdrop-blur-xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-lg glow-indigo">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                  CleanPaste
                </h1>
              </div>
              <p className="text-xs text-zinc-400">Instant text sanitizer & layout fixer</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl transition-all"
            >
              <History className="w-3.5 h-3.5" />
              History {historyItems.length > 0 && `(${historyItems.length})`}
            </button>
            <button
              onClick={() => setShowGuide(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-xl transition-all"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              User Guide
            </button>
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-red-400 bg-zinc-900/60 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/20 rounded-xl transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
            <button
              onClick={copyText}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white rounded-xl shadow-lg glow-cyan transition-all"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied" : "Copy Output"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl w-full mx-auto px-6 py-6 flex-1 flex flex-col gap-6">
        {/* Mode Selector & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-2 rounded-2xl glass-panel">
          {/* Cleaning Preset Modes */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {[
              { id: "safe", label: "Safe Mode", icon: Shield, desc: "For code & notes" },
              { id: "aggressive", label: "Aggressive", icon: Zap, desc: "Join PDF paragraphs" },
              { id: "code", label: "Code Mode", icon: FileCode, desc: "Sanitize snippets" },
              { id: "terminal", label: "Terminal / Log", icon: Terminal, desc: "Strip ANSI & prompts" },
              { id: "env", label: "Config / .env", icon: FileSpreadsheet, desc: "Sort & convert .env" },
              { id: "markdown", label: "Markdown Prep", icon: BookOpen, desc: "Fix headings & lists" },
            ].map((m) => {
              const Icon = m.icon;
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                    active
                      ? "bg-indigo-600/90 text-white shadow-md border border-indigo-400/30"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? "text-cyan-300" : ""}`} />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* View Toggle (Output vs Diff) */}
          <div className="flex items-center gap-1 p-1 bg-zinc-900/80 rounded-xl border border-zinc-800/80">
            <button
              onClick={() => setViewMode("output")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === "output"
                  ? "bg-zinc-800 text-white border border-zinc-700"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Output
            </button>
            <button
              onClick={() => setViewMode("diff")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === "diff"
                  ? "bg-zinc-800 text-white border border-zinc-700"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />
              Diff View
            </button>
          </div>
        </div>

        {/* Text Editors Grid */}
        <div className="grid md:grid-cols-2 gap-5 min-h-[380px]">
          {/* Input Panel */}
          <div className="flex flex-col h-96 rounded-2xl glass-panel border border-zinc-800/80 overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/60 bg-zinc-950/40 text-xs text-zinc-400">
              <span className="font-semibold text-zinc-300 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-indigo-400" /> Raw Input
                {detectedFormat && (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono font-bold tracking-wide animate-pulse">
                    {detectedFormat.toUpperCase()} DETECTED
                  </span>
                )}
              </span>
              <span className="text-[11px] text-zinc-500">Paste your messy text below</span>
            </div>
            <textarea
              placeholder="Paste messy text, JSON, terminal logs, SQL, or .env lines..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full h-full p-4 bg-transparent outline-none resize-none font-mono text-sm text-zinc-200 placeholder:text-zinc-600 leading-relaxed overflow-y-auto"
            />
          </div>

          {/* Output / Diff Panel */}
          <div className="flex flex-col h-96 rounded-2xl glass-panel border border-zinc-800/80 overflow-hidden shadow-xl">
            <div className="flex flex-wrap items-center justify-between px-4 py-2 gap-2 border-b border-zinc-800/60 bg-zinc-950/40 text-xs text-zinc-400">
              <span className="font-semibold text-zinc-300 flex items-center gap-2">
                {viewMode === "output" ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Cleaned Result
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" /> Live Diff Changes
                  </>
                )}
              </span>

              {/* Developer Hygiene Quick Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 rounded-lg p-0.5 text-[11px]">
                  <button
                    onClick={prettifyData}
                    title="Prettify & Auto-Fix JSON / SQL"
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-zinc-800 text-cyan-400 font-medium"
                  >
                    <Wand2 className="w-3 h-3" /> Prettify
                  </button>
                  <button
                    onClick={minifyData}
                    title="Minify to single line"
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-zinc-800 text-zinc-300 font-medium"
                  >
                    <Code2 className="w-3 h-3" /> Minify
                  </button>
                  <button
                    onClick={convertEnvToJson}
                    title="Convert .env <-> JSON"
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-zinc-800 text-indigo-400 font-medium"
                  >
                    <FileJson className="w-3 h-3" /> .env ↔ JSON
                  </button>
                </div>

                {/* Case Convert Buttons */}
                <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 rounded-lg p-0.5 text-[11px]">
                  <button
                    onClick={() => transformCase("upper")}
                    title="UPPERCASE"
                    className="px-1.5 py-0.5 rounded hover:bg-zinc-800 text-zinc-300 font-mono"
                  >
                    AA
                  </button>
                  <button
                    onClick={() => transformCase("lower")}
                    title="lowercase"
                    className="px-1.5 py-0.5 rounded hover:bg-zinc-800 text-zinc-300 font-mono"
                  >
                    aa
                  </button>
                  <button
                    onClick={() => transformCase("title")}
                    title="Title Case"
                    className="px-1.5 py-0.5 rounded hover:bg-zinc-800 text-zinc-300 font-mono"
                  >
                    Aa
                  </button>
                  <button
                    onClick={() => transformCase("slug")}
                    title="slug-case"
                    className="px-1.5 py-0.5 rounded hover:bg-zinc-800 text-zinc-300 font-mono"
                  >
                    a-b
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => downloadFile("cleaned_text", "txt")}
                    title="Download .txt"
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-[11px] transition-all"
                  >
                    <Download className="w-3 h-3 text-cyan-400" /> .txt
                  </button>
                  <button
                    onClick={() => downloadFile("cleaned_text", "md")}
                    title="Download .md"
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-[11px] transition-all"
                  >
                    <Download className="w-3 h-3 text-indigo-400" /> .md
                  </button>
                </div>

                {stats.charsRemoved > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
                    -{stats.charsRemoved} chars saved
                  </span>
                )}
              </div>
            </div>

            {viewMode === "output" ? (
              <textarea
                readOnly
                placeholder="Cleaned output will appear here..."
                value={output}
                className="w-full h-full p-4 bg-transparent outline-none resize-none font-mono text-sm text-cyan-50/90 leading-relaxed placeholder:text-zinc-600 overflow-y-auto"
              />
            ) : (
              <div className="w-full h-full p-4 overflow-y-auto font-mono text-sm leading-relaxed whitespace-pre-wrap bg-zinc-950/30">
                {diffResult.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-zinc-600 text-xs">
                    No text to compare yet.
                  </div>
                ) : (
                  diffResult.map((part, index) => {
                    const color = part.added
                      ? "bg-emerald-500/20 text-emerald-300 px-0.5 rounded"
                      : part.removed
                      ? "bg-rose-500/20 text-rose-400 line-through px-0.5 rounded"
                      : "text-zinc-400";
                    return (
                      <span key={index} className={color}>
                        {part.value}
                      </span>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Fine-Grained Rules & Stats Row */}
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Rules & Toggles */}
          <div className="lg:col-span-2 p-4 rounded-2xl glass-panel flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
              <Settings2 className="w-4 h-4 text-indigo-400" /> Fine-Grained Sanitizers
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
              {[
                { key: "removeZeroWidth", label: "Strip Zero-Width Chars" },
                { key: "tabToSpaces", label: "Convert Tabs to 4 Spaces" },
                { key: "trimTrailing", label: "Trim Trailing Whitespace" },
                { key: "collapseEmptyLines", label: "Collapse Multi Empty Lines" },
                { key: "stripHtml", label: "Strip HTML Tags" },
                { key: "stripEmojis", label: "Remove Emojis" },
                { key: "smartQuotesToStraight", label: "Fix Smart Quotes (“ ” → \" \")" },
                { key: "unescapeHtmlEntities", label: "Unescape HTML (&amp; → &)" },
                { key: "stripAnsi", label: "Strip ANSI Escape Codes (Terminal)" },
                { key: "stripPrompts", label: "Strip Command Prompts ($ , > )" },
                { key: "stripLineNumbers", label: "Strip Stack Trace Line #s" },
                { key: "fixMalformedJson", label: "Auto-Fix Malformed JSON" },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center gap-2.5 p-2 rounded-xl bg-zinc-900/40 hover:bg-zinc-800/40 border border-zinc-800/50 cursor-pointer text-zinc-300 transition-all"
                >
                  <input
                    type="checkbox"
                    checked={settings[item.key]}
                    onChange={(e) =>
                      setSettings({ ...settings, [item.key]: e.target.checked })
                    }
                    className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-950 text-indigo-500 focus:ring-0 accent-indigo-500"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Real-time Stats Card */}
          <div className="p-4 rounded-2xl glass-panel flex flex-col justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
              <Layers className="w-4 h-4 text-cyan-400" /> Text Intelligence
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800/60">
                <span className="text-[10px] text-zinc-500 block">Words</span>
                <span className="text-lg font-bold text-white">{stats.wordCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800/60">
                <span className="text-[10px] text-zinc-500 block">Characters</span>
                <span className="text-lg font-bold text-white">{stats.cleanChars}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800/60">
                <span className="text-[10px] text-zinc-500 block">Lines</span>
                <span className="text-lg font-bold text-white">{stats.lineCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800/60">
                <span className="text-[10px] text-zinc-500 block flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5 text-zinc-400" /> Read Time
                </span>
                <span className="text-lg font-bold text-white">{stats.readingTimeMinutes}m</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/60">
              <span>Shortcut: <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">Ctrl+Enter</kbd></span>
              <span className="text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> Auto-Sanitized
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-800/60 bg-zinc-950/40 px-6 py-3 text-center text-xs text-zinc-500">
        CleanPaste Pro &bull; Instant Privacy-First Local Cleaning
      </footer>

      {/* User Guide Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto glass-panel border border-zinc-700/60 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 text-zinc-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">CleanPaste Pro — User Guide</h2>
                  <p className="text-xs text-zinc-400">How to clean & sanitize messy text effectively</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Steps */}
            <div className="space-y-4 text-xs leading-relaxed">
              {/* Step 1 */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Paste Raw Messy Text</h3>
                  <p className="text-zinc-400">
                    Paste text copied from PDFs, websites, ChatGPT, code snippets, or scanned documents directly into the left <strong>Raw Input</strong> panel.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-600 text-white font-bold flex items-center justify-center text-xs">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Choose a Preset Cleaning Mode</h3>
                  <ul className="list-disc list-inside space-y-1 text-zinc-400">
                    <li><strong className="text-zinc-200">Safe Mode:</strong> Standard cleanup converting tabs to 4 spaces, trimming trailing spaces, and removing zero-width characters.</li>
                    <li><strong className="text-zinc-200">Aggressive Mode:</strong> Merges broken lines from PDFs into continuous readable paragraphs.</li>
                    <li><strong className="text-zinc-200">Code Mode:</strong> Cleans code snippets by converting tabs to 2 spaces and stripping trailing padding.</li>
                    <li><strong className="text-zinc-200">Markdown Prep:</strong> Fixes markdown headings spacing and standardizes list dashes.</li>
                    <li><strong className="text-zinc-200">Terminal & Logs:</strong> Strips ANSI escape colors, shell prompts (<code>$</code>, <code>&gt;</code>), and log line numbers.</li>
                    <li><strong className="text-zinc-200">.env Sanitizer:</strong> Cleans, deduplicates, and alphabetically sorts environment variable key-value pairs.</li>
                  </ul>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Toggle Fine-Grained Rules</h3>
                  <p className="text-zinc-400 mb-2">
                    Customize your cleaning pipeline by enabling granular toggles:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-zinc-400">
                    <li><strong className="text-zinc-200">Zero-Width Chars:</strong> Removes hidden invisible unicode characters (e.g. <code>\u200B</code>).</li>
                    <li><strong className="text-zinc-200">Tabs to Spaces:</strong> Converts tab characters into standard indentation spaces.</li>
                    <li><strong className="text-zinc-200">Trim Trailing Spaces:</strong> Strips unnecessary whitespace from line endings.</li>
                    <li><strong className="text-zinc-200">Collapse Empty Lines:</strong> Merges multiple blank lines into a single blank line.</li>
                    <li><strong className="text-zinc-200">Strip HTML Tags:</strong> Removes HTML elements like <code>&lt;div&gt;</code>, <code>&lt;p&gt;</code>, <code>&lt;a&gt;</code>, leaving raw text.</li>
                    <li><strong className="text-zinc-200">Remove Emojis:</strong> Strips unicode emoji symbols for clean plain text.</li>
                    <li><strong className="text-zinc-200">Smart Quotes:</strong> Converts curly quotation marks (“”, ‘’) into straight quotes (", ').</li>
                    <li><strong className="text-zinc-200">Unescape HTML:</strong> Converts HTML entities like <code>&amp;amp;</code> and <code>&amp;lt;</code> back to <code>&amp;</code> and <code>&lt;</code>.</li>
                    <li><strong className="text-zinc-200">Strip ANSI Codes:</strong> Removes terminal color formatting sequences (e.g. <code>\x1b[31m</code>).</li>
                    <li><strong className="text-zinc-200">Strip Prompts:</strong> Removes terminal command prefixes like <code>$</code>, <code>&gt;</code>, or <code>user@host:~$</code>.</li>
                    <li><strong className="text-zinc-200">Strip Line Numbers:</strong> Removes leading stack trace or code line numbers (<code>1:</code>, <code>[1]</code>).</li>
                    <li><strong className="text-zinc-200">Fix Malformed JSON:</strong> Auto-formats single quotes, missing quotes, or unquoted keys in JSON.</li>
                  </ul>
                </div>
              </div>

              {/* Step 4 */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-600 text-white font-bold flex items-center justify-center text-xs">
                  4
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Quick Utility Tools (1-Click Actions)</h3>
                  <ul className="list-disc list-inside space-y-1 text-zinc-400">
                    <li><strong className="text-zinc-200">Prettify Code / JSON:</strong> Formats JSON and code snippets with clean 2-space indentation and line breaks.</li>
                    <li><strong className="text-zinc-200">Minify Code / JSON:</strong> Removes all unnecessary whitespace, newlines, and padding for compact payloads.</li>
                    <li><strong className="text-zinc-200">.env &rarr; JSON Converter:</strong> Transforms environment variable key-value lines into a structured JSON object.</li>
                  </ul>
                </div>
              </div>

              {/* Step 5 */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                  5
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Inspect Changes & Copy</h3>
                  <p className="text-zinc-400">
                    Switch to <strong>Diff View</strong> to visually see green added text and red struck-through removed text. Click <strong>Copy Output</strong> to copy your sanitized result.
                  </p>
                </div>
              </div>

              {/* Keyboard Shortcuts Section */}
              <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-zinc-300">
                <div className="flex items-center gap-2 font-semibold text-indigo-300 mb-2">
                  <Keyboard className="w-4 h-4" /> Handy Keyboard Shortcuts
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="flex justify-between p-2 rounded-xl bg-zinc-900/80 border border-zinc-800">
                    <span>Re-sanitize Text:</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200">Ctrl + Enter</kbd>
                  </div>
                  <div className="flex justify-between p-2 rounded-xl bg-zinc-900/80 border border-zinc-800">
                    <span>Close User Guide:</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200">Esc</kbd>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-zinc-800 pt-3 flex justify-end">
              <button
                onClick={() => setShowGuide(false)}
                className="px-5 py-2 text-xs font-semibold bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white rounded-xl shadow-lg transition-all"
              >
                Got It, Let's Clean!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Slide-Out Drawer */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md h-full glass-panel border-l border-zinc-700/60 p-6 flex flex-col gap-4 text-zinc-200 shadow-2xl animate-in slide-in-from-right">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <History className="w-5 h-5 text-indigo-400" />
                <h2 className="text-base font-bold text-white">Cleaning History</h2>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="p-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {historyItems.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-zinc-500 text-xs gap-2">
                  <History className="w-8 h-8 opacity-40" />
                  <span>No saved history yet</span>
                </div>
              ) : (
                historyItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800/60 border border-zinc-800/80 flex flex-col gap-2 transition-all group"
                  >
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span className="flex items-center gap-1.5 font-medium text-zinc-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                        {item.mode.toUpperCase()} MODE
                      </span>
                      <div className="flex items-center gap-2">
                        <span>{item.timestamp}</span>
                        <button
                          onClick={() => toggleFavorite(item.id)}
                          className="hover:text-amber-400"
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              item.favorite ? "text-amber-400 fill-amber-400" : "text-zinc-600"
                            }`}
                          />
                        </button>
                        <button
                          onClick={() => deleteHistoryItem(item.id)}
                          className="hover:text-red-400 text-zinc-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs font-mono text-zinc-300 line-clamp-2 bg-zinc-950/40 p-2 rounded-xl border border-zinc-900">
                      {item.output}
                    </p>

                    <button
                      onClick={() => {
                        setInput(item.input);
                        setOutput(item.output);
                        setMode(item.mode);
                        setShowHistory(false);
                        showToast("Restored snippet from history");
                      }}
                      className="self-start text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                    >
                      Restore Snippet &rarr;
                    </button>
                  </div>
                ))
              )}
            </div>

            {historyItems.length > 0 && (
              <button
                onClick={() => {
                  setHistoryItems([]);
                  showToast("Cleared history");
                }}
                className="w-full py-2 text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-all font-medium"
              >
                Clear History
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
