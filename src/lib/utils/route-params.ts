const positiveIntegerRouteParamPattern = /^[1-9]\d*$/;

export const parsePositiveIntegerRouteParam = (value: string) => {
  if (!positiveIntegerRouteParamPattern.test(value)) {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isSafeInteger(parsedValue) ? parsedValue : null;
};
