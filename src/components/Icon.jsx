
export const Icon = ({ name, size=18 }) => {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", xmlns:"http://www.w3.org/2000/svg" };
  switch(name){
    case "search": return (
      <svg {...common}><path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2"/><path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
    );
    case "x": return (
      <svg {...common}><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
    );
    case "plus": return (
      <svg {...common}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
    );
    case "loc": return (
      <svg {...common}><path d="M12 21s6-5.686 6-11A6 6 0 1 0 6 10c0 5.314 6 11 6 11Z" stroke="currentColor" strokeWidth="2"/><path d="M12 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" fill="currentColor"/></svg>
    );
    case "hamburger": return (
      <svg {...common}><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
    );
    case "pencil": return (
      <svg {...common}><path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
    );
    case "trash": return (
      <svg {...common}><path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M8 6V4h8v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M6 6l1 16h10l1-16" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
    );
    case "move": return (
      <svg {...common}><path d="M12 2l3 3-3 3-3-3 3-3Z" fill="currentColor"/><path d="M12 22l3-3-3-3-3 3 3 3Z" fill="currentColor"/><path d="M2 12l3-3 3 3-3 3-3-3Z" fill="currentColor"/><path d="M22 12l-3-3-3 3 3 3 3-3Z" fill="currentColor"/></svg>
    );
    case "chev": return (
      <svg {...common}><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    );
    case "chevDown": return (
      <svg {...common}><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    );
    case "eye": return (
      <svg {...common}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" stroke="currentColor" strokeWidth="2"/><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="2"/></svg>
    );
    default: return null;
  }
};
