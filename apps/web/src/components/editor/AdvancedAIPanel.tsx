"use client";

import { useState, useRef } from "react";
import {
  Sparkles,
  Film,
  Copy,
  MessageSquare,
  HelpCircle,
  Loader2,
  Check,
  Lightbulb,
  AlertTriangle,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/locale-provider";

type Scene = {
  title: string;
  type: string;
  description: string;
  characters: string[];
  emotion: string;
  goal: string;
  estimatedLength: string;
};

type ScenePlan = {
  scenes: Scene[];
  chapterArc: string;
  tensionCurve: string;
};

type AlternativeVariant = {
  title: string;
  approach: string;
  content: string;
  tone: string;
  consequences: string;
  pros: string[];
  cons: string[];
};

type Cliffhanger = {
  title: string;
  style: string;
  text: string;
  setup: string;
  hook: string;
  intensity: string;
};

type WhatIfResult = {
  scenario: string;
  immediateEffects: string[];
  characterImpact: { character: string; impact: string }[];
  plotConsequences: { event: string; probability: string }[];
  newConflicts: string[];
  storyDirection: string;
  scenarioText?: string;
  recommendation: string;
};

type Props = {
  bookId: string;
  chapterId: string;
  chapterTitle: string;
  chapterSummary: string;
  currentContent: string;
  onInsertText: (text: string) => void;
};

export default function AdvancedAIPanel({
  bookId,
  chapterId,
  chapterTitle,
  chapterSummary,
  currentContent,
  onInsertText,
}: Props) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"scene" | "alternative" | "cliffhanger" | "dialog" | "whatif">("scene");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Scene Planning
  const [scenePlan, setScenePlan] = useState<ScenePlan | null>(null);
  const [sceneCount, setSceneCount] = useState(3);

  // Alternative Scenes
  const [alternatives, setAlternatives] = useState<AlternativeVariant[]>([]);
  const [sceneDescription, setSceneDescription] = useState("");
  const [variantCount, setVariantCount] = useState(2);

  // Cliffhanger
  const [cliffhangers, setCliffhangers] = useState<Cliffhanger[]>([]);
  const [cliffhangerStyle, setCliffhangerStyle] = useState("suspense");

  // Dialog
  const [dialogText, setDialogText] = useState("");
  const [improvedDialog, setImprovedDialog] = useState("");

  // What-If
  const [whatIfScenario, setWhatIfScenario] = useState("");
  const [whatIfResult, setWhatIfResult] = useState<WhatIfResult | null>(null);
  const [explorationDepth, setExplorationDepth] = useState("medium");

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    // Strip HTML tags for clipboard
    const plainText = text.replace(/<[^>]*>/g, "");
    navigator.clipboard.writeText(plainText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // --- Scene Planning ---
  const handleScenePlanning = async () => {
    setIsLoading(true);
    setError(null);
    setScenePlan(null);

    try {
      const response = await fetch(`/api/books/${bookId}/ai/scene-planning`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId, sceneCount }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Generierung fehlgeschlagen");
      }

      const data = await response.json();
      setScenePlan(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler bei der Generierung");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Alternative Scenes ---
  const handleAlternativeScenes = async () => {
    if (!sceneDescription.trim()) {
      setError("Bitte gib eine Szenen-Beschreibung ein");
      return;
    }
    setIsLoading(true);
    setError(null);
    setAlternatives([]);

    try {
      const response = await fetch(`/api/books/${bookId}/ai/alternative-scenes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId, sceneDescription, variantCount }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Generierung fehlgeschlagen");
      }

      const data = await response.json();
      setAlternatives(data.variants || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler bei der Generierung");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Cliffhanger ---
  const handleCliffhanger = async () => {
    setIsLoading(true);
    setError(null);
    setCliffhangers([]);

    try {
      const response = await fetch(`/api/books/${bookId}/ai/cliffhanger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId, currentContent, style: cliffhangerStyle }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Generierung fehlgeschlagen");
      }

      const data = await response.json();
      setCliffhangers(data.cliffhangers || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler bei der Generierung");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Dialog Improvement ---
  const handleDialogImprovement = async () => {
    if (!dialogText.trim()) {
      setError("Bitte gib einen Dialog-Text ein");
      return;
    }
    setIsLoading(true);
    setError(null);
    setImprovedDialog("");

    try {
      const response = await fetch(`/api/books/${bookId}/ai/inline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "improve_dialog",
          text: dialogText,
          context: currentContent,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Generierung fehlgeschlagen");
      }

      // Process SSE stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Stream nicht verfügbar");

      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(trimmed.slice(6));
            if (data.text !== undefined) {
              setImprovedDialog(data.text);
              accumulated = data.text;
            } else if (data.token) {
              accumulated += data.token;
              setImprovedDialog(accumulated);
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler bei der Generierung");
    } finally {
      setIsLoading(false);
    }
  };

  // --- What-If ---
  const handleWhatIf = async () => {
    if (!whatIfScenario.trim()) {
      setError("Bitte gib ein Szenario ein");
      return;
    }
    setIsLoading(true);
    setError(null);
    setWhatIfResult(null);

    try {
      const response = await fetch(`/api/books/${bookId}/ai/what-if`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId, scenario: whatIfScenario, explorationDepth }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Generierung fehlgeschlagen");
      }

      const data = await response.json();
      setWhatIfResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler bei der Generierung");
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: "scene" as const, icon: Film, label: t({ de: "Szenen", en: "Scenes" }) },
    { id: "alternative" as const, icon: Copy, label: t({ de: "Varianten", en: "Variants" }) },
    { id: "cliffhanger" as const, icon: AlertTriangle, label: t({ de: "Cliffhanger", en: "Cliffhanger" }) },
    { id: "dialog" as const, icon: MessageSquare, label: t({ de: "Dialog", en: "Dialog" }) },
    { id: "whatif" as const, icon: HelpCircle, label: t({ de: "Was-wäre-wenn", en: "What-if" }) },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="flex border-b overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setError(null); }}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {error && (
          <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* === SCENE PLANNING === */}
        {activeTab === "scene" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t({ de: "Anzahl Szenen", en: "Number of scenes" })}
              </label>
              <select
                value={sceneCount}
                onChange={(e) => setSceneCount(Number(e.target.value))}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
              </select>
            </div>

            <Button onClick={handleScenePlanning} disabled={isLoading} className="w-full">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Film className="mr-2 h-4 w-4" />}
              {t({ de: "Szenenplan erstellen", en: "Create scene plan" })}
            </Button>

            {scenePlan && (
              <div className="space-y-3">
                <div className="p-3 rounded-md bg-secondary text-sm">
                  <div className="font-medium mb-1">{t({ de: "Kapitel-Bogen", en: "Chapter arc" })}</div>
                  <p className="text-muted-foreground">{scenePlan.chapterArc}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{t({ de: "Spannungskurve", en: "Tension curve" })}:</span>
                    <span className="text-xs font-medium">{scenePlan.tensionCurve}</span>
                  </div>
                </div>

                {scenePlan.scenes.map((scene, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs">
                          {i + 1}
                        </span>
                        {scene.title}
                        <span className="text-xs text-muted-foreground ml-auto">{scene.type}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-2">
                      <p>{scene.description}</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                          {scene.emotion}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                          {scene.estimatedLength}
                        </span>
                      </div>
                      {scene.characters.length > 0 && (
                        <div className="text-muted-foreground">
                          {t({ de: "Charaktere", en: "Characters" })}: {scene.characters.join(", ")}
                        </div>
                      )}
                      <div className="text-muted-foreground italic">{scene.goal}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* === ALTERNATIVE SCENES === */}
        {activeTab === "alternative" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t({ de: "Szenen-Beschreibung", en: "Scene description" })}
              </label>
              <textarea
                value={sceneDescription}
                onChange={(e) => setSceneDescription(e.target.value)}
                placeholder={t({
                  de: "Beschreibe die Szene, für die du Alternativen möchtest...",
                  en: "Describe the scene you want alternatives for...",
                })}
                className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t({ de: "Anzahl Varianten", en: "Number of variants" })}
              </label>
              <select
                value={variantCount}
                onChange={(e) => setVariantCount(Number(e.target.value))}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </div>

            <Button onClick={handleAlternativeScenes} disabled={isLoading} className="w-full">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
              {t({ de: "Varianten generieren", en: "Generate variants" })}
            </Button>

            {alternatives.map((variant, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{variant.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-2">
                  <p className="text-muted-foreground">{variant.approach}</p>
                  <div className="p-2 rounded bg-secondary whitespace-pre-wrap">{variant.content.replace(/<[^>]*>/g, "")}</div>
                  <div className="text-muted-foreground">
                    <strong>{t({ de: "Ton", en: "Tone" })}:</strong> {variant.tone}
                  </div>
                  <div className="text-muted-foreground">
                    <strong>{t({ de: "Konsequenzen", en: "Consequences" })}:</strong> {variant.consequences}
                  </div>
                  {variant.pros.length > 0 && (
                    <div className="text-green-600 dark:text-green-400">
                      <strong>{t({ de: "Vorteile", en: "Pros" })}:</strong> {variant.pros.join(", ")}
                    </div>
                  )}
                  {variant.cons.length > 0 && (
                    <div className="text-red-600 dark:text-red-400">
                      <strong>{t({ de: "Nachteile", en: "Cons" })}:</strong> {variant.cons.join(", ")}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onInsertText(variant.content)}
                      className="flex-1"
                    >
                      <Sparkles className="mr-1 h-3 w-3" />
                      {t({ de: "Einfügen", en: "Insert" })}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopy(variant.content, i)}
                    >
                      {copiedIndex === i ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* === CLIFFHANGER === */}
        {activeTab === "cliffhanger" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t({ de: "Cliffhanger-Stil", en: "Cliffhanger style" })}
              </label>
              <select
                value={cliffhangerStyle}
                onChange={(e) => setCliffhangerStyle(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="suspense">{t({ de: "Spannung", en: "Suspense" })}</option>
                <option value="emotional">{t({ de: "Emotional", en: "Emotional" })}</option>
                <option value="mystery">{t({ de: "Geheimnisvoll", en: "Mystery" })}</option>
                <option value="action">{t({ de: "Action", en: "Action" })}</option>
                <option value="revelation">{t({ de: "Enthüllung", en: "Revelation" })}</option>
              </select>
            </div>

            <Button onClick={handleCliffhanger} disabled={isLoading} className="w-full">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertTriangle className="mr-2 h-4 w-4" />}
              {t({ de: "Cliffhanger generieren", en: "Generate cliffhangers" })}
            </Button>

            {cliffhangers.map((ch, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    {ch.title}
                    <span className={`text-xs ml-auto px-2 py-0.5 rounded ${
                      ch.intensity === "high" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                      ch.intensity === "medium" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    }`}>
                      {ch.intensity}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-2">
                  <div className="p-2 rounded bg-secondary whitespace-pre-wrap">{ch.text.replace(/<[^>]*>/g, "")}</div>
                  <div className="text-muted-foreground">
                    <strong>{t({ de: "Aufbau", en: "Setup" })}:</strong> {ch.setup}
                  </div>
                  <div className="text-muted-foreground">
                    <strong>{t({ de: "Hook", en: "Hook" })}:</strong> {ch.hook}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onInsertText(ch.text)}
                      className="flex-1"
                    >
                      <Sparkles className="mr-1 h-3 w-3" />
                      {t({ de: "Als Kapitelende einfügen", en: "Insert as chapter end" })}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopy(ch.text, i)}
                    >
                      {copiedIndex === i ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* === DIALOG IMPROVEMENT === */}
        {activeTab === "dialog" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t({ de: "Dialog-Text zum Verbessern", en: "Dialog text to improve" })}
              </label>
              <textarea
                value={dialogText}
                onChange={(e) => setDialogText(e.target.value)}
                placeholder={t({
                  de: "Füge hier den Dialog ein, den du verbessern möchtest...",
                  en: "Paste the dialog you want to improve here...",
                })}
                className="w-full min-h-[120px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <Button onClick={handleDialogImprovement} disabled={isLoading} className="w-full">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
              {t({ de: "Dialog verbessern", en: "Improve dialog" })}
            </Button>

            {improvedDialog && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    {t({ de: "Verbesserter Dialog", en: "Improved dialog" })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-2">
                  <div className="p-2 rounded bg-secondary whitespace-pre-wrap">
                    {improvedDialog.replace(/<[^>]*>/g, "")}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onInsertText(improvedDialog)}
                      className="flex-1"
                    >
                      <Sparkles className="mr-1 h-3 w-3" />
                      {t({ de: "Einfügen", en: "Insert" })}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopy(improvedDialog, -1)}
                    >
                      {copiedIndex === -1 ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* === WHAT-IF === */}
        {activeTab === "whatif" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t({ de: "Was wäre wenn...?", en: "What if...?" })}
              </label>
              <textarea
                value={whatIfScenario}
                onChange={(e) => setWhatIfScenario(e.target.value)}
                placeholder={t({
                  de: "z.B. 'Was wäre, wenn der Protagonist den Antagonisten nicht besiegt, sondern sich ihm anschließt?'",
                  en: "e.g. 'What if the protagonist doesn't defeat the antagonist but joins them?'",
                })}
                className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t({ de: "Tiefe der Analyse", en: "Exploration depth" })}
              </label>
              <select
                value={explorationDepth}
                onChange={(e) => setExplorationDepth(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="short">{t({ de: "Kurz", en: "Short" })}</option>
                <option value="medium">{t({ de: "Mittel", en: "Medium" })}</option>
                <option value="long">{t({ de: "Ausführlich", en: "Detailed" })}</option>
              </select>
            </div>

            <Button onClick={handleWhatIf} disabled={isLoading} className="w-full">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
              {t({ de: "Szenario erkunden", en: "Explore scenario" })}
            </Button>

            {whatIfResult && (
              <div className="space-y-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t({ de: "Sofortige Auswirkungen", en: "Immediate effects" })}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-xs space-y-1">
                      {whatIfResult.immediateEffects.map((effect, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-primary">&#8226;</span>
                          {effect}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {whatIfResult.characterImpact.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{t({ de: "Charakter-Auswirkungen", en: "Character impact" })}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs space-y-2">
                        {whatIfResult.characterImpact.map((ci, i) => (
                          <div key={i}>
                            <span className="font-medium">{ci.character}:</span>{" "}
                            <span className="text-muted-foreground">{ci.impact}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {whatIfResult.plotConsequences.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{t({ de: "Handlungs-Konsequenzen", en: "Plot consequences" })}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs space-y-2">
                        {whatIfResult.plotConsequences.map((pc, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              pc.probability === "high" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                              pc.probability === "medium" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                              "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                            }`}>
                              {pc.probability}
                            </span>
                            {pc.event}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {whatIfResult.newConflicts.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{t({ de: "Neue Konflikte", en: "New conflicts" })}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-xs space-y-1">
                        {whatIfResult.newConflicts.map((conflict, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <AlertTriangle className="h-3 w-3 text-yellow-500 shrink-0 mt-0.5" />
                            {conflict}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                <div className="p-3 rounded-md bg-secondary text-sm">
                  <div className="font-medium mb-1">{t({ de: "Geschichtsrichtung", en: "Story direction" })}</div>
                  <p className="text-muted-foreground text-xs">{whatIfResult.storyDirection}</p>
                </div>

                {whatIfResult.scenarioText && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{t({ de: "Szenario-Text", en: "Scenario text" })}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-2">
                      <div className="p-2 rounded bg-secondary whitespace-pre-wrap">
                        {whatIfResult.scenarioText.replace(/<[^>]*>/g, "")}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onInsertText(whatIfResult.scenarioText!)}
                        className="w-full"
                      >
                        <Sparkles className="mr-1 h-3 w-3" />
                        {t({ de: "Als Alternative einfügen", en: "Insert as alternative" })}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <div className="p-3 rounded-md bg-primary/10 text-sm">
                  <div className="font-medium mb-1 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    {t({ de: "Empfehlung", en: "Recommendation" })}
                  </div>
                  <p className="text-xs">{whatIfResult.recommendation}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
