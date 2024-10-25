const latexHighlight = (code: string): string => {
  // Define regex patterns for different LaTeX elements
  const patterns = [
    { regex: /\\[a-zA-Z]+/g, color: "#4A90E2" }, // Commands
    { regex: /\$.*?\$/g, color: "#5DA5E8" }, // Inline math
    { regex: /\\\(.*?\\\)/g, color: "#5DA5E8" }, // Inline math (alternative)
    { regex: /\\\[.*?\\\]/g, color: "#6CB2F2" }, // Display math
    { regex: /\{.*?\}/g, color: "#7DBFFA" }, // Curly braces content
    { regex: /\[.*?\]/g, color: "#8ECCFF" }, // Square brackets content
  ];

  // Apply highlighting
  let highlightedCode = code;
  patterns.forEach(({ regex, color }) => {
    highlightedCode = highlightedCode.replace(
      regex,
      (match) => `<span style="color: ${color}">${match}</span>`
    );
  });

  return highlightedCode;
};

export default latexHighlight;
