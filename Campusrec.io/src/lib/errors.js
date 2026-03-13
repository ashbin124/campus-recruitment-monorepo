export function getErrorMessage(error, fallback = 'Something went wrong.') {
  if (!error) return fallback;
  if (typeof error === 'string') return error;

  const responseMessage = error?.response?.data?.message;
  const validationIssue = Array.isArray(error?.response?.data?.errors)
    ? error.response.data.errors[0]?.message
    : undefined;
  const genericMessage = error?.message;
  const message = responseMessage || validationIssue || genericMessage;

  return message ? String(message) : fallback;
}
