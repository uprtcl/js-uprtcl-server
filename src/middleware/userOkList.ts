const okLiks: string[] = JSON.parse(
  process.env.VALID_USERS ? process.env.VALID_USERS : '[]'
);

export const isValidUser = (userId: string) => {
  if (process.env.ONLY_VALID_USERS === undefined) {
    throw new Error(
      "ONLY_VALID_USERS should be set to 'false' in the .env file for development"
    );
  }
  if (process.env.ONLY_VALID_USERS !== 'false') {
    if (okLiks.includes(userId)) {
      return userId;
    }
    throw new Error(`User ${userId} not authorized`);
  }
  return userId;
};
