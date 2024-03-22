export const keepDuplicatesWithHighestValue = (list, dateKey, valueKey) => {
  const uniqueObjects = {};
  for (const obj of list) {
    const currentDate = obj[dateKey];
    const currentValue = obj[valueKey];

    if (
      !uniqueObjects[currentDate] ||
      uniqueObjects[currentDate][valueKey] < currentValue
    ) {
      uniqueObjects[currentDate] = obj;
    }
  }

  return Object.values(uniqueObjects);
};
