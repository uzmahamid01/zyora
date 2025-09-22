let lastMethod: "chrome" | "popup" | "redirect" | null = null;

export function setLastAuthMethod(m: "chrome" | "popup" | "redirect") {
  lastMethod = m;
}

export function getLastAuthMethod() {
  return lastMethod;
}

export default { setLastAuthMethod, getLastAuthMethod };
