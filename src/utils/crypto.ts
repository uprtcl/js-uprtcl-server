const crypto = require('crypto');

export const generateToken = ({
  stringBase = 'base64',
  byteLength = 48,
} = {}): Promise<string> => {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(
      byteLength,
      (err: any, buffer: { toString: (arg0: string) => string }) => {
        if (err) {
          reject(err);
        } else {
          resolve(buffer.toString(stringBase));
        }
      }
    );
  });
};
