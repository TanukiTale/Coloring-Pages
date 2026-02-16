export const formatDateTime = (iso?: string): string => {
  if (!iso) {
    return '-';
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString();
};

export const formatDuration = (durationMs?: number): string => {
  if (!durationMs || durationMs < 0) {
    return '-';
  }

  const totalSeconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
};
