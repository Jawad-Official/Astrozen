import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidProps {
  chart: string;
  onNodeClick?: (id: string) => void;
}

const Mermaid: React.FC<MermaidProps> = ({ chart, onNodeClick }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<{ message: string; raw: string } | null>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'dark',
      securityLevel: 'loose',
      fontFamily: 'Inter, sans-serif',
      themeVariables: {
        primaryColor: '#3b82f6',
        primaryTextColor: '#fff',
        primaryBorderColor: '#3b82f6',
        lineColor: '#60a5fa',
        secondaryColor: '#1e293b',
        tertiaryColor: '#0f172a'
      },
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
      }
    });

    // Define the global callback for mermaid clicks
    (window as any).mermaidClick = (id: string) => {
      console.log("Mermaid node clicked:", id);
      if (onNodeClick) {
        onNodeClick(id);
      }
    };
  }, [onNodeClick]);

  useEffect(() => {
    if (chart) {
      setRenderError(null);
      
      // Clear previous content
      if (ref.current) {
        ref.current.innerHTML = '';
        ref.current.removeAttribute('data-processed');
      }

      const id = 'mermaid-svg-' + Math.random().toString(36).substr(2, 9);
      
      try {
        // Basic cleanup of chart string
        const cleanChart = chart.trim();
        
        mermaid.render(id, cleanChart)
          .then((result) => {
            if (ref.current) {
              ref.current.innerHTML = result.svg;
              
              // Force SVG to be responsive
              const svg = ref.current.querySelector('svg');
              if (svg) {
                svg.style.maxWidth = '100%';
                svg.style.height = 'auto';
                svg.style.display = 'block';
              }

              // Add cursor pointer to all nodes
              const nodes = ref.current.querySelectorAll('.node');
              nodes.forEach((node: any) => {
                node.style.cursor = 'pointer';
                node.classList.add('hover:opacity-80', 'transition-opacity');
              });
            }
          })
          .catch((err) => {
            console.error("Mermaid render error:", err);
            setRenderError({ message: err.message, raw: chart });
          });
      } catch (e: any) {
        console.error("Mermaid sync error:", e);
        setRenderError({ message: e.message, raw: chart });
      }
    }
  }, [chart]);

  if (renderError) {
    return (
      <div className="p-4 border border-red-500/50 rounded bg-red-500/10 text-red-200 text-sm overflow-auto max-w-full">
        <p className="font-bold mb-2">Diagram Render Error</p>
        <pre className="whitespace-pre-wrap mb-4 font-mono text-xs text-red-300">{renderError.message}</pre>
        <details>
          <summary className="cursor-pointer text-xs opacity-70 hover:opacity-100">View Source</summary>
          <pre className="mt-2 p-2 bg-black/30 rounded text-[10px] font-mono whitespace-pre overflow-auto max-h-40">
            {renderError.raw}
          </pre>
        </details>
      </div>
    );
  }

  return <div key={chart} ref={ref} className="mermaid w-full flex justify-center overflow-auto py-4" />;
};

export default Mermaid;
