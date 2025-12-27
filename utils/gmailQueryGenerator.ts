export function generateGmailQuery(subject: string, address: string): string {
  const parts: string[] = [];

  if (subject.trim()) {
    // If the subject has multiple words, wrap in parentheses for Gmail logic
    const cleanSubject = subject.trim();
    parts.push(`subject:(${cleanSubject})`);
  }

  if (address.trim()) {
    // Wrap email in quotes
    const cleanAddress = address.trim();
    parts.push(`\"${cleanAddress}\"`);
  }

  return parts.join(" ");
}
