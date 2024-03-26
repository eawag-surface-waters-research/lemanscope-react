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

export const sortOccurrencesByDate = (observations) => {
  const occurrences = {};
  observations.forEach((observation) => {
    const date = observation.image.date_photo.split(" ")[0].replaceAll("-", "");
    if (occurrences[date]) {
      occurrences[date].push(observation);
    } else {
      occurrences[date] = [observation];
    }
  });
  return occurrences;
};
