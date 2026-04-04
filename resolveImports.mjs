const REMOTE_CACHE = new Map();

/**
 * Resolves remote Solidity imports (like OpenZeppelin) by fetching from unpkg.
 * @param {Object} sources - Map of filename -> { content }
 * @returns {Promise<Object>} - Updated sources map with resolved dependencies
 */
export async function resolveImports(sources) {
  const importRegex = /import\s+["']([^"']+)["'];/g;
  const resolved = { ...sources };
  const pending = Object.keys(sources);
  const visited = new Set(pending);

  while (pending.length > 0) {
    const currentFile = pending.shift();
    const content = resolved[currentFile].content;
    let match;

    // Reset regex for each file
    importRegex.lastIndex = 0;
    
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      
      // Skip if already in workspace or fetched
      if (resolved[importPath]) continue;

      if (REMOTE_CACHE.has(importPath)) {
        console.log("Using cached remote import:", importPath);
        resolved[importPath] = { content: REMOTE_CACHE.get(importPath) };
        if (!visited.has(importPath)) {
          visited.add(importPath);
          pending.push(importPath);
        }
        continue;
      }

      console.log("Resolving remote import:", importPath);
      
      try {
        let fetchUrl = "";
        
        if (importPath.startsWith("@openzeppelin/")) {
          fetchUrl = `https://unpkg.com/${importPath}`;
        } else if (importPath.startsWith("http")) {
          fetchUrl = importPath;
        }

        if (fetchUrl) {
          const response = await fetch(fetchUrl);
          if (response.ok) {
            const fetchedContent = await response.text();
            resolved[importPath] = { content: fetchedContent };
            REMOTE_CACHE.set(importPath, fetchedContent);
            
            if (!visited.has(importPath)) {
              visited.add(importPath);
              pending.push(importPath);
            }
          } else {
            console.error(`Failed to fetch ${importPath} from ${fetchUrl}: ${response.status}`);
          }
        }
      } catch (e) {
        console.error(`Error resolving import ${importPath}:`, e.message);
      }
    }
  }
  
  return resolved;
}
