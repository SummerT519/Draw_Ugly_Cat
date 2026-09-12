"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppProvider";

type Tool = "brush" | "eraser";

export function DrawingCanvas({ catId }: { catId: string }) {
  const { language } = useApp();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef(-1);
  const [tool, setTool] = useState<Tool>("brush");
  const [colour, setColour] = useState("#1d1d1b");
  const [size, setSize] = useState(12);
  const [historyState, setHistoryState] = useState({ index: -1, length: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showEmptyWarning, setShowEmptyWarning] = useState(false);

  function snapshot() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(context.getImageData(0, 0, canvas.width, canvas.height));
    if (historyRef.current.length > 30) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
    setHistoryState({ index: historyIndexRef.current, length: historyRef.current.length });
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    context.fillStyle = "#fffdf7";
    context.fillRect(0, 0, canvas.width, canvas.height);
    historyRef.current = [context.getImageData(0, 0, canvas.width, canvas.height)];
    historyIndexRef.current = 0;
    setHistoryState({ index: 0, length: 1 });
  }, []);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const context = canvas.getContext("2d")!;
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    const { x, y } = point(event);
    context.beginPath();
    context.moveTo(x, y);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = tool === "eraser" ? "#fffdf7" : colour;
    context.lineWidth = size;
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const context = canvasRef.current!.getContext("2d")!;
    const { x, y } = point(event);
    context.lineTo(x, y);
    context.stroke();
  }

  function stop() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    snapshot();
  }

  function restore(index: number) {
    const canvas = canvasRef.current;
    if (!canvas || !historyRef.current[index]) return;
    canvas.getContext("2d")!.putImageData(historyRef.current[index], 0, 0);
    historyIndexRef.current = index;
    setHistoryState({ index, length: historyRef.current.length });
  }

  function clear() {
    const canvas = canvasRef.current!;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#fffdf7";
    context.fillRect(0, 0, canvas.width, canvas.height);
    snapshot();
  }

  async function submit() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pixels = canvas.getContext("2d", { willReadFrequently: true })?.getImageData(0, 0, canvas.width, canvas.height).data;
    let hasInk = false;
    if (pixels) {
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index] !== 255 || pixels[index + 1] !== 253 || pixels[index + 2] !== 247 || pixels[index + 3] !== 255) {
          hasInk = true;
          break;
        }
      }
    }
    if (!hasInk) {
      setShowEmptyWarning(true);
      return;
    }
    setSubmitting(true);
    setError("");
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;
    const form = new FormData();
    form.append("image", blob, "drawing.png");
    const response = await fetch(`/api/cats/${catId}/drawings`, { method: "POST", body: form });
    const data = await response.json();
    if (response.ok || data.error === "ALREADY_DRAWN") {
      router.push(`/cat/${catId}`);
      return;
    }
    setSubmitting(false);
    setError(language === "zh" ? "作品没有保存成功，请重试。" : "Your drawing wasn’t saved. Try again.");
  }

  const canUndo = historyState.index > 0;
  const canRedo = historyState.index >= 0 && historyState.index < historyState.length - 1;

  return (
    <div className="canvas-shell">
      <div className="canvas-toolbar">
        <div className="tool-group">
          <button className={tool === "brush" ? "tool-button active" : "tool-button"} onClick={() => setTool("brush")}>
            <span>✎</span>{language === "zh" ? "画笔" : "Brush"}
          </button>
          <button className={tool === "eraser" ? "tool-button active" : "tool-button"} onClick={() => setTool("eraser")}>
            <span>▱</span>{language === "zh" ? "橡皮" : "Eraser"}
          </button>
        </div>
        <label className="colour-control" title={language === "zh" ? "颜色" : "Colour"}>
          <input type="color" value={colour} onChange={(event) => { setColour(event.target.value); setTool("brush"); }} />
          <span style={{ background: colour }} />
        </label>
        <label className="size-control">
          <span>{language === "zh" ? "粗细" : "Size"}</span>
          <input type="range" min="2" max="48" value={size} onChange={(event) => setSize(Number(event.target.value))} />
          <strong>{size}</strong>
        </label>
        <div className="toolbar-spacer" />
        <button className="icon-button" disabled={!canUndo} onClick={() => restore(historyIndexRef.current - 1)} title={language === "zh" ? "撤销" : "Undo"}>↶</button>
        <button className="icon-button" disabled={!canRedo} onClick={() => restore(historyIndexRef.current + 1)} title={language === "zh" ? "重做" : "Redo"}>↷</button>
        <button className="text-tool-button" onClick={clear}>{language === "zh" ? "清空" : "Clear"}</button>
      </div>
      <canvas
        ref={canvasRef}
        width={900}
        height={700}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={stop}
        onPointerCancel={stop}
        onPointerLeave={stop}
        aria-label={language === "zh" ? "绘画画布" : "Drawing canvas"}
      />
      <div className="canvas-submit-row">
        <p>{language === "zh" ? "觉得自己画得太丑了...还有这种好事？" : "Accuracy is optional. Spirit is mandatory."}</p>
        <button className="button primary submit-drawing" onClick={submit} disabled={submitting}>
          {submitting ? (language === "zh" ? "正在保存…" : "Saving…") : (language === "zh" ? "完成并偷看大家的画 →" : "Finish & reveal the gallery →")}
        </button>
      </div>
      {error && <p className="form-error canvas-error">{error}</p>}
      {showEmptyWarning && (
        <div className="modal-backdrop empty-canvas-warning" role="dialog" aria-modal="true" aria-labelledby="empty-canvas-title">
          <div className="warning-card">
            <div className="modal-cat">ฅ(=･ω･=)ฅ</div>
            <p className="eyebrow danger-text">EMPTY CANVAS</p>
            <h2 id="empty-canvas-title">{language === "zh" ? "画板还是空的！" : "Your canvas is still empty!"}</h2>
            <p className="muted">{language === "zh" ? "先留下几笔再提交吧，猫猫不能靠想象出现。" : "Add a few marks before submitting. Cats cannot appear by imagination alone."}</p>
            <button className="button primary wide" onClick={() => setShowEmptyWarning(false)}>{language === "zh" ? "好，回去画猫" : "Okay, back to drawing"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
