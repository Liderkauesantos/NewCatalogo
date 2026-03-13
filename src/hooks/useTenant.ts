export function useTenant(): string {
  const slug = window.location.pathname.split('/')[1];
  return slug ?? '';
}
