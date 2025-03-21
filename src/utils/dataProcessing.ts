/**
 * Function to merge multiple author names into a single author
 * This is useful when the same person has commits under different names
 * 
 * @param authorGroups Array of author name groups (first name in each array is the main name)
 * @param excludeAuthors Array of author names to exclude from the data
 */
export function mergeAuthors(authorGroups: string[][] = [], excludeAuthors: string[] = []) {
  return function(dataObj: any) {
    // Clone the input data to avoid modifying the original
    const clonedData = JSON.parse(JSON.stringify(dataObj));
    const { data, authors, config } = clonedData;
    const mergedData = [];
    const newAuthors = new Set<string>();

    const nameMap = new Map<string, string>();
    console.log('Author groups:', authorGroups);
    console.log('Authors to exclude:', excludeAuthors);

    // Create mapping from variant names to main name
    authorGroups.forEach(group => {
      if (group.length === 0) return;
      
      const mainAuthor = group[0];
      if (!excludeAuthors.includes(mainAuthor)) {
        newAuthors.add(mainAuthor);
        group.forEach(name => {
          if (!excludeAuthors.includes(name) && authors.includes(name)) {
            nameMap.set(name, mainAuthor);
          }
        });
      }
    });

    // Add remaining authors who aren't in groups or excluded
    authors.forEach(author => {
      if (!nameMap.has(author) && !excludeAuthors.includes(author)) {
        newAuthors.add(author);
      }
    });

    console.log('Resulting authors after filtering:', Array.from(newAuthors));
    console.log('Name mapping:', Object.fromEntries(nameMap));

    // Process all data points
    data.forEach((point: any, index: number) => {
      const newPoint: Record<string, any> = { 
        interval: point.interval || point.month,
        month: point.month || point.interval 
      };
      
      const tempCommits = new Map<string, number>();
      const tempEdits = new Map<string, number>();

      // Initialize with zeros for all authors
      newAuthors.forEach(author => {
        tempCommits.set(author, 0);
        tempEdits.set(author, 0);
      });

      // Merge commit and edit counts based on name mapping
      for (const [key, value] of Object.entries(point)) {
        if (key === 'interval' || key === 'month') continue;
        const [author, type] = key.split('_');

        if (excludeAuthors.includes(author)) {
          continue;
        }

        const targetAuthor = nameMap.get(author) || author;
        if (excludeAuthors.includes(targetAuthor)) {
          continue;
        }

        const targetMap = type === 'commits' ? tempCommits : tempEdits;
        targetMap.set(
          targetAuthor,
          (targetMap.get(targetAuthor) || 0) + (value as number)
        );
      }

      // Populate new data point
      newAuthors.forEach(author => {
        newPoint[`${author}_commits`] = tempCommits.get(author);
        newPoint[`${author}_edits`] = tempEdits.get(author);
      });

      mergedData.push(newPoint);
    });

    const result = {
      data: mergedData,
      authors: Array.from(newAuthors),
      config,
      _originalData: dataObj // Keep reference to original data
    };

    return result;
  };
}
