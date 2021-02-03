export const encodeData = (data: any) => {
  const dataCoded = { ...data };
  if (dataCoded.text !== undefined)
    dataCoded.text = dataCoded.text.replace(/"/g, '&quot;');
  if (dataCoded.title !== undefined)
    dataCoded.title = dataCoded.title.replace(/"/g, '&quot;');

  const dataString = JSON.stringify(dataCoded).replace(/"/g, '\\"');
  return dataString;
};

export const decodeData = (encodedData: string) => {
  const data = JSON.parse(encodedData);
  if (data.text !== undefined) data.text = data.text.replace(/&quot;/g, '"');
  if (data.title !== undefined) data.title = data.title.replace(/&quot;/g, '"');
  return data;
};
