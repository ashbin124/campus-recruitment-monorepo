import { z } from 'zod';

function formatIssue(issue) {
  const path = issue.path?.length ? issue.path.join('.') : 'root';
  return {
    path,
    message: issue.message,
  };
}

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const input = req[source];
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: parsed.error.issues.map(formatIssue),
      });
    }

    req[source] = parsed.data;
    return next();
  };
}

const positiveInt = z.coerce.number().int().positive();
export function parsePositiveIntSchema(fieldName = 'id') {
  return z.object({
    [fieldName]: positiveInt,
  });
}
