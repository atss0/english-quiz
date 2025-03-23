// Shuffle array (Fisher-Yates algorithm)
export const shuffleArray = <T>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };
  
  // Group array items by a key
  export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
    return array.reduce((result: Record<string, T[]>, item) => {
      const groupKey: string = String(item[key]);
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(item);
      return result;
    }, {} as Record<string, T[]>);
  };
  
  // Remove duplicates from array
  export const uniqueArray = <T>(array: T[]): T[] => {
    return [...new Set(array)];
  };
  
  