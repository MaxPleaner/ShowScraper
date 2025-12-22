export const truncateTitle = (title, max = 80) =>
  title.length > max ? `${title.slice(0, max)}...` : title;
