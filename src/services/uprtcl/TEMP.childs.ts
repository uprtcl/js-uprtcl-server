export const getDataChildren = (data: any): string[] => {
  if (data.pages !== undefined) return data.pages;
  if (data.links !== undefined) return data.links;
  if (data.linkedThoughts !== undefined) return [data.linkedThoughts];
  if (data.sections !== undefined)
    return Object.getOwnPropertyNames(data.sections).map(
      (name) => data.sections[name]
    );

  throw new Error(`Unexpected data object ${data}`);
};
