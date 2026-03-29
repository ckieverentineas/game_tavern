type CookieRecord = {
  name: string;
  value: string;
};

type SetCookieInput = string | CookieRecord;
type DeleteCookieInput = string | { name: string };

const cookieJar = new Map<string, string>();

function resolveCookieName(input: DeleteCookieInput) {
  return typeof input === "string" ? input : input.name;
}

const cookieStore = {
  get(name: string): CookieRecord | undefined {
    const value = cookieJar.get(name);

    return typeof value === "string" ? { name, value } : undefined;
  },
  set(input: SetCookieInput, value?: string) {
    if (typeof input === "string") {
      if (typeof value !== "string") {
        throw new Error(`Cookie \"${input}\" требует строковое значение.`);
      }

      cookieJar.set(input, value);
      return;
    }

    cookieJar.set(input.name, input.value);
  },
  delete(input: DeleteCookieInput) {
    cookieJar.delete(resolveCookieName(input));
  },
};

export async function cookies() {
  return cookieStore;
}

export function resetMockCookies() {
  cookieJar.clear();
}

export function setMockCookie(name: string, value: string) {
  cookieJar.set(name, value);
}

export function getMockCookie(name: string) {
  return cookieJar.get(name) ?? null;
}
