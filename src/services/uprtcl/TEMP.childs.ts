export const getDataChildren = (object: any): string[] => {
  if (object.pages !== undefined) return object.pages;
  if (object.links !== undefined) return object.links;
  if (object.linkedThoughts !== undefined) return [object.linkedThoughts];
  if (object.sections !== undefined)
    return Object.getOwnPropertyNames(object.sections).map(
      (name) => object.sections[name]
    );

  throw new Error(`Unexpected object object ${JSON.stringify(object)}`);
};
