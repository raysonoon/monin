let isLoggedIn = false;

export function getIsLoggedIn(): boolean {
  return isLoggedIn;
}

export function setIsLoggedIn(value: boolean) {
  isLoggedIn = value;
}
