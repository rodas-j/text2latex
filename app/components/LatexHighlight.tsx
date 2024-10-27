import React, { useEffect, useRef } from "react";
import latexHighlight from "../utils/latexHighlight";

interface LatexHighlightProps {
  code: string;
  className?: string;
}

const LatexHighlight: React.FC<LatexHighlightProps> = ({ code, className }) => {
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (preRef.current) {
      preRef.current.innerHTML = latexHighlight(code);
    }
  }, [code]);

  return <pre ref={preRef} className={`whitespace-pre-wrap ${className}`} />;
};

export default LatexHighlight;
