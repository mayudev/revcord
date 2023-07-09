export function truncate(value: string, limit: number) {
  let returnValue = value;
  if (value.length > limit) {
    returnValue = value.slice(0, limit - 3) + "...";
  }

  return returnValue;
}

export function fitOrEmpty(value: string, limit: number) {
  if (value.length > limit) {
    return "";
  } else return value;
}
