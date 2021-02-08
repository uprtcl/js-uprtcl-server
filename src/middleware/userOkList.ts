export const isValidUser = (userId: string) => {
  if (process.env.ONLY_VALID_USERS === undefined) {
    throw new Error(
      "ONLY_VALID_USERS should be set to 'false' in the .env file for development"
    );
  }
  if (process.env.ONLY_VALID_USERS !== 'false') {
    return [''].includes(userId) ? userId : undefined;
  }
  return userId;
};
